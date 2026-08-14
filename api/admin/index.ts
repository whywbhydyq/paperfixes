import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';
import { isAdminUser } from '../_lib/constants.js';
import {
  expireAllDuePlans,
} from '../_lib/plan-entitlements.js';
import { rejectCrossOriginMutation } from '../_lib/http-security.js';
import { createRedemptionCodes } from '../_lib/redemption-code.js';
import {
  applyPlanCredit,
  PLAN_CHANGE_REQUIRES_EXPIRY_CODE,
} from '../_lib/plan-credit.js';

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

const REDEMPTION_INPUT_ERRORS = new Set([
  'REDEMPTION_PLAN_INVALID',
  'REDEMPTION_QUOTA_INVALID',
  'REDEMPTION_QUANTITY_INVALID',
  'REDEMPTION_PRICE_INVALID',
  'REDEMPTION_SOURCE_INVALID',
  'REDEMPTION_NOTE_INVALID',
  'REDEMPTION_EXPIRY_INVALID',
]);

export function normalizePlans(plans: PlanConfig[]): { plans: PlanConfig[]; changed: boolean } {
  let changed = false;
  const normalized = plans.map((plan) => {
    const features = Array.isArray(plan.features)
      ? plan.features.filter((feature): feature is string => typeof feature === 'string')
      : [];

    if (plan.planKey !== 'free') {
      const nextFeatures = [
        ...features.filter((feature) => !/永久有效|30\s*天有效/.test(feature)),
        '30 天有效',
      ];
      changed = changed || JSON.stringify(plan.features) !== JSON.stringify(nextFeatures);
      return { ...plan, features: nextFeatures };
    }

    const freeDefaults = DEFAULT_PLANS[0];
    const sourceFeatures = features.length ? features : freeDefaults.features;
    const nextFeatures = [...new Set(sourceFeatures.map((feature) =>
      /免费|注册|额度/.test(feature) ? '注册即送 3 次免费降 AI 率额度' : feature
    ))];
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
  if (req.method !== 'GET' && rejectCrossOriginMutation(req, res)) return;
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
      const normalized = normalizePlans(plans as PlanConfig[]).plans;
      await prisma.config.upsert({
        where: { key: 'pricing_plans' },
        update: { value: JSON.stringify(normalized) },
        create: { key: 'pricing_plans', value: JSON.stringify(normalized) },
      });
      return res.status(200).json({ plans: normalized });
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
      if (quota !== undefined || plan !== undefined) {
        return res.status(400).json({
          error: '套餐与额度只能通过一次性套餐发放变更',
          code: 'DIRECT_ENTITLEMENT_EDIT_DISABLED',
        });
      }
      const data: Record<string, unknown> = {};
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

    const { userId, planKey, note, amount, quota, price } = req.body || {};
    if (amount !== undefined || quota !== undefined || price !== undefined) {
      return res.status(400).json({
        error: '额度与价格必须使用服务端套餐配置',
        code: 'PLAN_GRANT_FIELDS_FORBIDDEN',
      });
    }
    if (typeof userId !== 'string' || typeof planKey !== 'string') {
      return res.status(400).json({ error: '参数错误', code: 'PLAN_GRANT_INVALID' });
    }

    const plans = await ensureDefaultConfig();
    const plan = plans.find((candidate) =>
      candidate.planKey === planKey && candidate.active && candidate.planKey !== 'free'
    );
    if (!plan) {
      return res.status(400).json({ error: '套餐不存在或已停用', code: 'PLAN_GRANT_INVALID' });
    }

    try {
      const creditedUser = await prisma.$transaction((tx) => applyPlanCredit(tx, {
        userId,
        planKey: plan.planKey,
        quota: plan.quota,
        price: plan.price,
        note: typeof note === 'string' && note.trim() ? note.trim() : '管理员发放一次性套餐',
        effectiveAt: new Date(),
      }));
      return res.status(200).json({
        plan: {
          planKey: plan.planKey,
          name: plan.name,
          quota: plan.quota,
          price: plan.price,
        },
        user: creditedUser,
      });
    } catch (error) {
      if (error instanceof Error && error.message === PLAN_CHANGE_REQUIRES_EXPIRY_CODE) {
        return res.status(409).json({
          error: '当前付费套餐有效期内只能再次发放同一套餐',
          code: PLAN_CHANGE_REQUIRES_EXPIRY_CODE,
        });
      }
      throw error;
    }
  }

  // ===== /api/admin?resource=redemption-codes =====
  if (resource === 'redemption-codes') {
    const auth = await checkAdmin(req);
    if (!auth.ok) return res.status(403).json({ error: '无权限' });

    if (req.method === 'GET') {
      const codes = await prisma.redemptionCode.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          codeHint: true,
          planKey: true,
          quota: true,
          price: true,
          source: true,
          batchId: true,
          note: true,
          redeemedById: true,
          redeemedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      });
      return res.status(200).json({ codes });
    }

    if (req.method === 'POST') {
      const { planKey, quantity, source, note, expiresAt: rawExpiresAt } = req.body || {};
      const plans = await ensureDefaultConfig();
      const plan = plans.find((candidate) =>
        candidate.planKey === planKey && candidate.active && candidate.planKey !== 'free'
      );
      if (!plan) return res.status(400).json({ error: '套餐不存在或已停用' });

      let expiresAt: Date | null = null;
      if (rawExpiresAt !== undefined && rawExpiresAt !== null && rawExpiresAt !== '') {
        expiresAt = new Date(rawExpiresAt);
        if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
          return res.status(400).json({ error: '兑换码过期时间无效' });
        }
      }

      try {
        const result = await createRedemptionCodes({
          planKey: plan.planKey,
          quota: plan.quota,
          price: plan.price,
          quantity,
          source,
          note,
          expiresAt,
        });
        res.setHeader('Cache-Control', 'private, no-store');
        return res.status(201).json({
          ...result,
          quantity: result.codes.length,
          plan: {
            planKey: plan.planKey,
            name: plan.name,
            quota: plan.quota,
            price: plan.price,
          },
          warning: '明文兑换码只显示本次，请立即保存并安全导入发码平台。',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message === 'REDEMPTION_GENERATION_CONFLICT') {
          return res.status(409).json({
            error: '兑换码生成冲突，请重试',
            retryable: true,
          });
        }
        if (REDEMPTION_INPUT_ERRORS.has(message)) {
          return res.status(400).json({ error: '兑换码批次参数无效' });
        }
        throw error;
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(400).json({ error: '缺少 resource 参数' });
}
