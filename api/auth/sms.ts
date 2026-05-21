import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { signToken } from '../_lib/auth.js';
import crypto from 'crypto';

function generateCode(): string {
  return Math.random().toString().slice(2, 8);
}

function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

async function sendSms(phone: string, code: string): Promise<boolean> {
  const accessKeyId = (process.env.ALIYUN_ACCESS_KEY_ID || '').trim();
  const accessKeySecret = (process.env.ALIYUN_ACCESS_KEY_SECRET || '').trim();

  if (!accessKeyId || !accessKeySecret) {
    console.log('[SMS-DEV] ', phone, ' => ', code);
    return true;
  }

  const signName = process.env.SMS_SIGN_NAME || '速通互联验证码';
  const templateCode = process.env.SMS_TEMPLATE_CODE || '100001';

  const params: Record<string, string> = {
    AccessKeyId: accessKeyId,
    Action: 'SendSmsVerifyCode',
    CodeLength: '6',
    CodeType: '1',
    Format: 'JSON',
    Interval: '60',
    PhoneNumber: phone,
    RegionId: 'cn-hangzhou',
    SignName: signName,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: '1.0',
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code, min: '5' }),
    Timestamp: new Date().toISOString().replace(/\.\d+Z/, 'Z'),
    ValidTime: '300',
    Version: '2017-05-25',
  };

  const sortedKeys = Object.keys(params).sort();
  const canonicalQuery = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');

  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonicalQuery)}`;
  const signature = crypto.createHmac('sha1', `${accessKeySecret}&`)
    .update(stringToSign)
    .digest('base64');

  const url = `https://dypnsapi.aliyuncs.com/?${canonicalQuery}&Signature=${percentEncode(signature)}`;

  try {
    const res = await fetch(url);
    const data = await res.json() as any;
    console.log('[SMS] 阿里云返回:', JSON.stringify(data));
    return data.Code === 'OK' && data.Success === true;
  } catch (err) {
    console.error('[SMS] 发送失败:', err);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, phone, code } = req.body || {};

  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({ error: '请输入正确的手机号' });
  }

  if (action === 'send') {
    const recent = await prisma.smsCode.findFirst({
      where: { phone, createdAt: { gt: new Date(Date.now() - 60000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      return res.status(429).json({ success: false, message: '发送太频繁，请60秒后再试' });
    }

    const dailyCount = await prisma.smsCode.count({
      where: {
        phone,
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (dailyCount >= 10) {
      return res.status(429).json({ success: false, message: '该手机号今日发送次数已达上限，请明天再试' });
    }

    const newCode = generateCode();
    const ok = await sendSms(phone, newCode);
    if (!ok) {
      return res.status(500).json({ success: false, message: '验证码发送失败，请稍后重试' });
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.smsCode.deleteMany({ where: { phone, expiresAt: { lt: new Date() } } });
    await prisma.smsCode.create({ data: { phone, code: newCode, expiresAt } });

    const isDev = !process.env.ALIYUN_ACCESS_KEY_ID;
    return res.status(200).json({
      success: true,
      message: '验证码已发送',
      ...(isDev ? { devCode: newCode } : {}),
    });
  }

  if (action === 'verify') {
    if (!code) return res.status(400).json({ error: '请输入验证码' });

    const smsCode = await prisma.smsCode.findFirst({
      where: { phone, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!smsCode || smsCode.code !== code) {
      return res.status(400).json({ error: '验证码错误或已过期' });
    }

    await prisma.smsCode.delete({ where: { id: smsCode.id } });

    let user = await prisma.user.findFirst({ where: { phone } });

    if (!user) {
      user = await prisma.user.create({
        data: { phone, plan: 'free', quota: 3, totalUsed: 0, role: 'user' },
      });
    }

    const token = signToken(user.id);

    return res.status(200).json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        wechatName: user.wechatName,
        role: user.role,
        plan: user.plan,
        quota: user.quota,
        totalUsed: user.totalUsed,
        hasPassword: !!user.passwordHash,
      },
      token,
      needsPassword: !user.passwordHash,
    });
  }

  return res.status(400).json({ error: '无效操作' });
}
