import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

function generateCode(): string {
  return Math.random().toString().slice(2, 8);
}

function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

async function sendSms(phone: string, code: string): Promise<boolean> {
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;

  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    console.log('[SMS-DEV] ', phone, ' => ', code);
    return true;
  }

  const params = new URLSearchParams();
  params.set('AccessKeyId', accessKeyId);
  params.set('Action', 'SendSms');
  params.set('Format', 'JSON');
  params.set('PhoneNumbers', phone);
  params.set('RegionId', 'cn-hangzhou');
  params.set('SignName', signName || '');
  params.set('SignatureMethod', 'HMAC-SHA1');
  params.set('SignatureNonce', crypto.randomUUID());
  params.set('SignatureVersion', '1.0');
  params.set('TemplateCode', templateCode || '');
  params.set('TemplateParam', JSON.stringify({ code }));
  params.set('Timestamp', new Date().toISOString().replace(/\.\d+Z/, 'Z'));
  params.set('Version', '2017-05-25');

  const sorted = [...params.entries()].sort(([a],[b]) => a.localeCompare(b));
  const canonicalized = sorted.map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(canonicalized)}`;
  const signature = crypto.createHmac('sha1', accessKeySecret + '&').update(stringToSign).digest('base64');
  params.set('Signature', signature);

  try {
    const res = await fetch(`https://dysmsapi.aliyuncs.com/?${params.toString()}`);
    const data = await res.json() as any;
    console.log('[SMS] 阿里云返回:', JSON.stringify(data));
    return data.Code === 'OK';
  } catch (err) {
    console.error('[SMS] 发送失败:', err);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[SMS API] version=dypnsapi-v2');
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
        data: { phone, plan: 'free', quota: 2, totalUsed: 0, role: 'user' },
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });

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
      },
      token,
      needsPassword: !user.passwordHash,
    });
  }

  return res.status(400).json({ error: '无效操作' });
}
