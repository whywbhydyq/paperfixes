import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: '请输入手机号和密码' });

  const user = await prisma.user.findFirst({ where: { phone } });
  if (!user) return res.status(400).json({ error: '手机号未注册' });
  if (!user.passwordHash) return res.status(400).json({ error: '该账号尚未设置密码，请先用验证码登录' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: '密码错误' });

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
  });
}
