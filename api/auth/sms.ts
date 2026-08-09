import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { setSessionCookie, signToken } from '../_lib/auth.js';
import { getClientIp, rejectCrossOriginMutation } from '../_lib/http-security.js';
import { enforcePlanExpiry } from '../_lib/plan-entitlements.js';
import {
  generateSmsCode,
  getSmsRateLimitViolation,
  hashSmsCode,
  matchesSmsCode,
  MAX_SMS_VERIFY_ATTEMPTS,
} from '../_lib/sms-code.js';
import { sendSms } from '../_lib/sms.js';
import { toPublicUser } from '../_lib/user-view.js';

function isValidPhone(phone: unknown): phone is string {
  return typeof phone === 'string' && /^1[3-9]\d{9}$/.test(phone);
}

const verificationError = '验证码错误或已过期';

async function handleSmsRequest(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (rejectCrossOriginMutation(req, res)) return;

  const { action, phone, code } = req.body || {};
  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: '请输入正确的手机号' });
  }

  if (action === 'send') {
    const now = new Date();
    const requestIp = getClientIp(req);
    const minuteAgo = new Date(now.getTime() - 60 * 1000);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [phoneMinute, phoneDay, ipHour, ipDay] = await Promise.all([
      prisma.smsCode.count({ where: { phone, createdAt: { gt: minuteAgo } } }),
      prisma.smsCode.count({ where: { phone, createdAt: { gt: dayAgo } } }),
      prisma.smsCode.count({ where: { requestIp, createdAt: { gt: hourAgo } } }),
      prisma.smsCode.count({ where: { requestIp, createdAt: { gt: dayAgo } } }),
    ]);
    const violation = getSmsRateLimitViolation({ phoneMinute, phoneDay, ipHour, ipDay });
    if (violation) {
      return res.status(429).json({ success: false, error: violation, message: violation });
    }

    const newCode = generateSmsCode();
    let digest: string;
    try {
      digest = hashSmsCode(phone, newCode);
    } catch (error) {
      console.error('[SMS] code hashing is not configured', {
        message: error instanceof Error ? error.message : 'unknown',
      });
      return res.status(500).json({ success: false, error: '验证码发送失败，请稍后重试' });
    }

    await prisma.smsCode.updateMany({
      where: { phone, used: false },
      data: { used: true },
    });
    const smsCode = await prisma.smsCode.create({
      data: {
        phone,
        code: digest,
        requestIp,
        expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      },
    });

    try {
      const delivery = await sendSms(phone, newCode);
      return res.status(200).json({
        success: true,
        message: '验证码已发送',
        ...(delivery.mode === 'development' && process.env.NODE_ENV === 'development'
          ? { devCode: newCode }
          : {}),
      });
    } catch (error) {
      await prisma.smsCode.updateMany({
        where: { id: smsCode.id, used: false },
        data: { used: true },
      });
      console.error('[SMS] delivery failed', {
        message: error instanceof Error ? error.message : 'unknown',
      });
      return res.status(500).json({ success: false, error: '验证码发送失败，请稍后重试' });
    }
  }

  if (action === 'verify') {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: verificationError });
    }

    const now = new Date();
    const smsCode = await prisma.smsCode.findFirst({
      where: {
        phone,
        used: false,
        expiresAt: { gt: now },
        attempts: { lt: MAX_SMS_VERIFY_ATTEMPTS },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!smsCode) return res.status(400).json({ error: verificationError });

    let matches = false;
    try {
      matches = matchesSmsCode(phone, code, smsCode.code);
    } catch (error) {
      console.error('[SMS] code verification is not configured', {
        message: error instanceof Error ? error.message : 'unknown',
      });
      return res.status(500).json({ error: '验证码验证暂不可用，请稍后重试' });
    }

    if (!matches) {
      await prisma.smsCode.updateMany({
        where: { id: smsCode.id, used: false, attempts: smsCode.attempts },
        data: { attempts: { increment: 1 } },
      });
      return res.status(400).json({ error: verificationError });
    }

    const consumed = await prisma.smsCode.updateMany({
      where: {
        id: smsCode.id,
        used: false,
        attempts: { lt: MAX_SMS_VERIFY_ATTEMPTS },
        expiresAt: { gt: now },
      },
      data: { used: true },
    });
    if (consumed.count !== 1) return res.status(400).json({ error: verificationError });

    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, plan: 'free', quota: 3, totalUsed: 0, role: 'user' },
    });
    const currentUser = await enforcePlanExpiry(user.id);
    const token = signToken(currentUser.id);
    setSessionCookie(res, token);

    return res.status(200).json({
      user: toPublicUser(currentUser),
      needsPassword: !currentUser.passwordHash,
    });
  }

  return res.status(400).json({ error: '无效操作' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    return await handleSmsRequest(req, res);
  } catch (error: unknown) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : 'unknown';
    console.error('[SMS] request infrastructure failure', { code });
    if (res.headersSent) return;
    return res.status(503).json({
      success: false,
      error: '验证码服务正在升级，请稍后再试',
    });
  }
}
