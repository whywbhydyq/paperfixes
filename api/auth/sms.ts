import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { setSessionCookie, signToken } from '../_lib/auth.js';
import { getClientIp, rejectCrossOriginMutation } from '../_lib/http-security.js';
import { enforcePlanExpiry } from '../_lib/plan-entitlements.js';
import {
  generateSmsCode,
  hashSmsCode,
} from '../_lib/sms-code.js';
import { sendSms } from '../_lib/sms.js';
import {
  activateSmsReservation,
  expireSmsReservation,
  reserveSmsCode,
  SmsVerificationConfigurationError,
  verifyAndConsumeSmsCode,
} from '../_lib/sms-transactions.js';
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

    const reservation = await reserveSmsCode(prisma, {
      phone,
      requestIp,
      digest,
      now,
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
    });
    if (reservation.kind === 'rate-limited') {
      return res.status(429).json({
        success: false,
        error: reservation.message,
        message: reservation.message,
      });
    }

    let delivery;
    try {
      delivery = await sendSms(phone, newCode);
    } catch (error) {
      try {
        await expireSmsReservation(prisma, {
          id: reservation.id,
          phone,
          now: new Date(),
        });
      } catch (cleanupError) {
        const code = typeof cleanupError === 'object' && cleanupError !== null && 'code' in cleanupError
          ? String(cleanupError.code)
          : 'unknown';
        console.error('[SMS] reservation expiration failed', { code });
      }
      console.error('[SMS] delivery failed', {
        message: error instanceof Error ? error.message : 'unknown',
      });
      return res.status(500).json({ success: false, error: '验证码发送失败，请稍后重试' });
    }

    let activated: boolean;
    try {
      activated = await activateSmsReservation(prisma, {
        id: reservation.id,
        phone,
        now: new Date(),
      });
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : 'unknown';
      console.error('[SMS] reservation activation failed', { code });
      return res.status(503).json({
        success: false,
        error: '验证码状态确认失败，请重新获取',
      });
    }
    if (!activated) {
      return res.status(503).json({
        success: false,
        error: '验证码状态确认失败，请重新获取',
      });
    }
    return res.status(200).json({
      success: true,
      message: '验证码已发送',
      ...(delivery.mode === 'development' && process.env.NODE_ENV === 'development'
        ? { devCode: newCode }
        : {}),
    });
  }

  if (action === 'verify') {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: verificationError });
    }

    let verification: 'matched' | 'rejected';
    try {
      verification = await verifyAndConsumeSmsCode(prisma, { phone, candidate: code });
    } catch (error) {
      if (!(error instanceof SmsVerificationConfigurationError)) throw error;
      console.error('[SMS] code verification is not configured', {
        message: error instanceof Error ? error.message : 'unknown',
      });
      return res.status(500).json({ error: '验证码验证暂不可用，请稍后重试' });
    }
    if (verification === 'rejected') {
      return res.status(400).json({ error: verificationError });
    }

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
