import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma';
import { comparePassword, signToken } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};

  if (!email || !password) return res.status(400).json({ error: '邮箱和密码不能为空' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return res.status(401).json({ error: '邮箱或密码错误' });

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: '邮箱或密码错误' });

  const token = signToken(user.id);

  return res.status(200).json({
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
