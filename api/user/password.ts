import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest, comparePassword, hashPassword } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '请先登录' });

  const { oldPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少6位' });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: '用户不存在' });

  // 如果用户有密码，需要验证旧密码
  if (user.passwordHash) {
    if (!oldPassword) return res.status(400).json({ error: '请输入当前密码' });
    const valid = await comparePassword(oldPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: '当前密码不正确' });
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  return res.status(200).json({ success: true });
}