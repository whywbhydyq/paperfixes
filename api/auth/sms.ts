import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { signToken } from '../_lib/auth.js';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, phone, code } = req.body || {};

  if (action === 'send') {
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: '请输入正确的手机号' });
    }

    const recent = await prisma.smsCode.findFirst({
      where: { phone, createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) return res.status(429).json({ error: '发送太频繁，请 60 秒后再试' });

    const newCode = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.smsCode.create({ data: { phone, code: newCode, expiresAt } });

    console.log(`[SMS] phone=${phone} code=${newCode}`);

    // 生产环境接入真实短信服务商（阿里云/腾讯云），此处仅模拟
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(200).json({
      success: true,
      message: isDev ? `验证码已发送（开发模式：${newCode}）` : '验证码已发送，请查收短信',
      ...(isDev ? { devCode: newCode } : {}),
    });
  }

  if (action === 'verify') {
    if (!phone || !code) return res.status(400).json({ error: '手机号和验证码不能为空' });
    if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式不正确' });

    const smsRecord = await prisma.smsCode.findFirst({
      where: { phone, code, used: false, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!smsRecord) return res.status(401).json({ error: '验证码错误或已过期' });

    await prisma.smsCode.update({ where: { id: smsRecord.id }, data: { used: true } });

    // 查找或创建用户（phone字段已在schema中）
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: { phone, role: 'user', plan: 'free', quota: 5 },
      });
    }

    const token = signToken(user.id);
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        wechatName: user.wechatName,
        role: user.role,
        plan: user.plan,
        quota: user.quota,
        totalUsed: user.totalUsed,
      },
      token,
    });
  }

  return res.status(400).json({ error: '缺少 action 参数' });
}