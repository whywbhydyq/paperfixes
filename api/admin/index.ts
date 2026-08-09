import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';
import { isAdminUser } from '../_lib/constants.js';
import {
  calculateExtendedExpiry,
  expireAllDuePlans,
} from '../_lib/plan-entitlements.js';

interface PlanConfig {
  planKey: string;
  name: string;
  price: number;
  quota: number;
  minChars: number;
  maxChars: number;
  features: string[];
  popular: boolean;
  active: boolean;
  sortOrder: number;
}

const DEFAULT_PLANS: PlanConfig[] = [
  {
    planKey: 'free', name: '免费体验', price: 0, quota: 3,
    minChars: 40, maxChars: 500,
    features: ['注册即送 3 次免费降 AI 率额度', '单次最多 500 字', '标准改写质量', '手机登录即可使用'],
    popular: false, active: true, sortOrder: 0,
  },
  {
    planKey: 'basic', name: '基础套餐', price: 29, quota: 50,
    minChars: 40, maxChars: 3000,
    features: ['50 次改写额度', '单次最多 3000 字', '优先处理队列', '手机登录即可使用', '30 天有效'],
    popular: true, active: true, sortOrder: 1,
  },
  {
    planKey: 'pro', name: '专业套餐', price: 99, quota: 300,
    minChars: 40, maxChars: 5000,
    features: ['300 次改写额度', '单次最多 5000 字', '最高优先级处理', '手机登录即可使用', '30 天有效'],
    popular: false, active: true, sortOrder: 2,
  },
];

function normalizePlans(plans: PlanConfig[]): { plans: PlanConfig[]; changed: boolean } {
  let changed = false;
  const normalized = plans.map((plan) => {
    if (plan.planKey !== 'free') return plan;

    const freeDefaults = DEFAULT_PLANS[0];
    const features = plan.features?.length ? plan.features : freeDefaults.features;
    const nextFeatures = features.map((feature) =>
      /免费|注册|额度/.test(feature) ? '注册即送 3 次免费降 AI 率额度' : feature
    );

    if (!nextFeatures.includes('注册即送 3 次免费降 AI 率额度')) {
      nextFeatures.unshift('注册即送 3 次免费降 AI 率额度');
    }

    const nextPlan = {
      ...plan,
      quota: 3,
      features: nextFeatures,
    };

    changed = changed || plan.quota !== 3 || JSON.stringify(plan.features) !== JSON.stringify(nextFeatures);
    return nextPlan;
  });

  return { plans: normalized, changed };
}

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

  const parsedPlans = JSON.parse(existing.value) as PlanConfig[];
  const { plans, changed } = normalizePlans(parsedPlans);
  if (changed) {
    await prisma.config.update({
      where: { key: 'pricing_plans' },
      data: { value: JSON.stringify(plans) },
    });
  }

  return plans;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { resource } = req.query;

  // ===== /api/admin?resource=config =====
  if (resource === 'config') {
    if (req.method === 'GET') {
      const plans = await ensureDefaultConfig();
      const auth = await checkAdmin(req);
      if (auth.ok) {
        return res.status(200).json({ plans });
      }
      return res.status(200).json({ plans: plans.filter((p: { active: boolean }) => p.active) });
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
      await expireAllDuePlans();
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, phone: true, wechatName: true,
          role: true, plan: true, quota: true, totalUsed: true,
          planExpiresAt: true, createdAt: true,
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
      if (typeof plan === 'string') {
        data.plan = plan;
        if (plan === 'free') {
          data.planExpiresAt = null;
        } else {
          const current = await prisma.user.findUnique({ where: { id: targetId } });
          if (!current) return res.status(404).json({ error: '用户不存在' });
          if (!current.planExpiresAt || current.planExpiresAt <= new Date()) {
            data.planExpiresAt = calculateExtendedExpiry(new Date(), null);
          }
        }
      }
      if (typeof role === 'string') data.role = role;
      const updated = await prisma.user.update({
        where: { id: targetId },
        data,
        select: {
          id: true, email: true, phone: true, wechatName: true,
          role: true, plan: true, quota: true, totalUsed: true,
          planExpiresAt: true,
        },
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
