import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../_lib/prisma.js';
import { signToken } from '../../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, code } = req.body || {};
  if (!phone || !code) {
    return res.status(400).json({ error: '手机号和验证码不能为空' });
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: '手机号格式不正确' });
  }

  // 查找最新未使用的验证码
  const smsRecord = await prisma.smsCode.findFirst({
    where: {
      phone,
      code,
      used: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!smsRecord) {
    return res.status(401).json({ error: '验证码错误或已过期' });
  }

  // 标记为已使用
  await prisma.smsCode.update({
    where: { id: smsRecord.id },
    data: { used: true },
  });

  // 查找或创建用户
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