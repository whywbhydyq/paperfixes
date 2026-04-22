import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';
import { isAdminUser } from '../_lib/constants.js';

const DEFAULT_PLANS = [
  {
    planKey: 'free', name: '免费体验', price: 0, quota: 5,
    minChars: 40, maxChars: 500,
    features: ['5 次免费改写额度', '单次最多 500 字', '标准改写质量', '邮箱/手机登录'],
    popular: false, active: true, sortOrder: 0,
  },
  {
    planKey: 'basic', name: '基础套餐', price: 29, quota: 50,
    minChars: 40, maxChars: 3000,
    features: ['50 次改写额度', '单次最多 3000 字', '优先处理队列', '邮箱/手机登录', '30 天有效'],
    popular: true, active: true, sortOrder: 1,
  },
  {
    planKey: 'pro', name: '专业套餐', price: 99, quota: 300,
    minChars: 40, maxChars: 5000,
    features: ['300 次改写额度', '单次最多 5000 字', '最高优先级处理', '邮箱/手机登录', '90 天有效'],
    popular: false, active: true, sortOrder: 2,
  },
];

async function checkAdmin(req: VercelRequest): Promise<{ ok: boolean; userId?: string }> {
  const userId = getUserFromRequest(req);
  if (!userId) return { ok: false };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !isAdminUser(user.email, user.role)) return { ok: false };
  return { ok: true, userId };
}

async function ensureDefaultConfig() {
  const existing = await prisma.config.findUnique({ where: { key: 'pricing_plans' } });
  if (!existing) {
    await prisma.config.create({
      data: { key: 'pricing_plans', value: JSON.stringify(DEFAULT_PLANS) },
    });
    return DEFAULT_PLANS;
  }
  return JSON.parse(existing.value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { resource } = req.query;

  // ===== /api/admin?resource=config =====
  if (resource === 'config') {
    if (req.method === 'GET') {
      const plans = await ensureDefaultConfig();
      return res.status(200).json({ plans });
    }
    if (req.method === 'PUT') {
      const auth = await checkAdmin(req);
      if (!auth.ok) return res.status(403).json({ error: '无权限' });
      const { plans } = req.body || {};
      if (!Array.isArray(plans)) return res.status(400).json({ error: 'plans 必须是数组' });
      await prisma.config.upsert({
        where: { key: 'pricing_plans' },
        update: { value: JSON.stringify(plans) },
        create: { key: 'pricing_plans', value: JSON.stringify(plans) },
      });
      return res.status(200).json({ plans });
    }
  }

  // ===== /api/admin?resource=users =====
  if (resource === 'users') {
    const auth = await checkAdmin(req);
    if (!auth.ok) return res.status(403).json({ error: '无权限' });

    if (req.method === 'GET') {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, phone: true, wechatName: true,
          role: true, plan: true, quota: true, totalUsed: true, createdAt: true,
          jobs: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true, status: true, inputLen: true,
              outputLen: true, createdAt: true, doneAt: true,
            },
          },
        },
      });
      return res.status(200).json({ users });
    }

    if (req.method === 'PUT') {
      const url = new URL(req.url || '', 'http://localhost');
      const targetId = url.searchParams.get('id');
      if (!targetId) return res.status(400).json({ error: '缺少用户 ID' });
      const { quota, plan, role } = req.body || {};
      const data: Record<string, unknown> = {};
      if (typeof quota === 'number') data.quota = quota;
      if (typeof plan === 'string') data.plan = plan;
      if (typeof role === 'string') data.role = role;
      const updated = await prisma.user.update({
        where: { id: targetId },
        data,
        select: { id: true, email: true, phone: true, wechatName: true, role: true, plan: true, quota: true, totalUsed: true },
      });
      return res.status(200).json({ user: updated });
    }
  }

  // ===== /api/admin?resource=topup =====
  if (resource === 'topup') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const auth = await checkAdmin(req);
    if (!auth.ok) return res.status(403).json({ error: '无权限' });

    const { userId, amount, price, planKey, note } = req.body || {};
    if (!userId || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: '参数错误' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const topup = await tx.topup.create({
        data: {
          userId, amount,
          price: price || 0,
          planKey: planKey || 'manual',
          note: note || '管理员手动充值',
        },
      });
      const user = await tx.user.update({
        where: { id: userId },
        data: { quota: { increment: amount } },
        select: { id: true, email: true, phone: true, quota: true },
      });
      return { topup, user };
    });

    return res.status(200).json(result);
  }

  return res.status(400).json({ error: '缺少 resource 参数' });
}