import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { hashPassword, signToken } from '../_lib/auth.js';
import { ADMIN_EMAIL } from '../_lib/constants.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};

  if (!email || !password) return res.status(400).json({ error: '邮箱和密码不能为空' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: '邮箱格式不正确' });
  if (password.length < 6) return res.status(400).json({ error: '密码至少需要6位字符' });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: '该邮箱已被注册' });

  const passwordHash = await hashPassword(password);
  const isAdmin = email === ADMIN_EMAIL;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: isAdmin ? 'admin' : 'user',
    },
  });

  const token = signToken(user.id);

  return res.status(201).json({
    user: {
      id: user.id,
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
