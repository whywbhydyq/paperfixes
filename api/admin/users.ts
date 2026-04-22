import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';
import { isAdminUser } from '../_lib/constants.js';

function isAdmin(req: VercelRequest): string | null {
  const userId = getUserFromRequest(req);
  if (!userId) return null;
  // We'll verify admin status from DB in the handler
  return userId;
}

// GET /api/admin/users — list all users
// PUT /api/admin/users — batch update (body: { userId, updates })
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = isAdmin(req);
  if (!userId) return res.status(401).json({ error: '请先登录' });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !isAdminUser(user.email, user.role)) {
    return res.status(403).json({ error: '无权限访问' });
  }

  if (req.method === 'GET') {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, phone: true, wechatName: true, role: true, plan: true,
      quota: true, totalUsed: true, createdAt: true,
      jobs: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true, status: true, inputLen: true, outputLen: true,
          createdAt: true, doneAt: true,
        },
      },
    },
  });
  return res.status(200).json({ users });
  }

  if (req.method === 'PUT') {
    const { searchParams } = new URL(req.url || '', 'http://localhost');
    const targetId = searchParams.get('id');
    if (!targetId) return res.status(400).json({ error: '缺少用户ID' });

    const { quota, plan, role } = req.body || {};
    const data: Record<string, unknown> = {};
    if (typeof quota === 'number') data.quota = quota;
    if (typeof plan === 'string') data.plan = plan;
    if (typeof role === 'string') data.role = role;

    const updated = await prisma.user.update({
      where: { id: targetId },
      data,
      select: { id: true, email: true, wechatName: true, role: true, plan: true, quota: true, totalUsed: true },
    });
    return res.status(200).json({ user: updated });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
