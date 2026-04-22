// api/user/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '请先登录' });

  const { action } = req.query;

  // GET /api/user?action=quota
  if (req.method === 'GET' && action === 'quota') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { quota: true, totalUsed: true },
    });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    return res.status(200).json({ quota: user.quota, totalUsed: user.totalUsed });
  }

  // GET /api/user?action=jobs
  if (req.method === 'GET' && action === 'jobs') {
    const jobs = await prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, inputText: true, outputText: true,
        status: true, inputLen: true, outputLen: true,
        createdAt: true, doneAt: true,
      },
    });
    return res.status(200).json({ jobs });
  }

  // GET /api/user?action=topups
  if (req.method === 'GET' && action === 'topups') {
    const topups = await prisma.topup.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, amount: true, price: true,
        planKey: true, note: true, createdAt: true,
      },
    });
    return res.status(200).json({ topups });
  }

  // POST /api/user?action=password
  if (req.method === 'POST' && action === 'password') {
    const { getUserFromRequest: gufr, comparePassword, hashPassword } = 
      await import('../_lib/auth.js');
    const { oldPassword, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '新密码至少 6 位' });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.passwordHash) {
      if (!oldPassword) return res.status(400).json({ error: '请输入当前密码' });
      const valid = await comparePassword(oldPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ error: '当前密码不正确' });
    }
    const newHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}