import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';
import {  isAdminUser } from '../_lib/constants.js';

const DEFAULT_PLANS = [
  {
    planKey: 'free',
    name: '免费体验',
    price: 0,
    quota: 5,
    minChars: 40,
    maxChars: 500,
    features: ['5次免费改写额度', '单次最多500字', '标准改写质量', '邮箱/微信登录'],
    popular: false,
    active: true,
    sortOrder: 0,
  },
  {
    planKey: 'basic',
    name: '基础套餐',
    price: 29,
    quota: 50,
    minChars: 40,
    maxChars: 3000,
    features: ['50次改写额度', '单次最多3000字', '优先处理队列', '邮箱/微信登录', '30天有效'],
    popular: true,
    active: true,
    sortOrder: 1,
  },
  {
    planKey: 'pro',
    name: '专业套餐',
    price: 99,
    quota: 300,
    minChars: 40,
    maxChars: 5000,
    features: ['300次改写额度', '单次最多5000字', '最高优先级处理', '邮箱/微信登录', '90天有效'],
    popular: false,
    active: true,
    sortOrder: 2,
  },
];

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

async function checkAdmin(req: VercelRequest): Promise<boolean> {
  const userId = getUserFromRequest(req);
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return !!(user && isAdminUser(user.email, user.role));
}

// GET /api/admin/config — get pricing config
// PUT /api/admin/config — update pricing config
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const plans = await ensureDefaultConfig();
    return res.status(200).json({ plans });
  }

  if (req.method === 'PUT') {
    const isAdm = await checkAdmin(req);
    if (!isAdm) return res.status(403).json({ error: '无权限' });

    const { plans } = req.body || {};
    if (!Array.isArray(plans)) return res.status(400).json({ error: 'plans 必须是数组' });

    await prisma.config.upsert({
      where: { key: 'pricing_plans' },
      update: { value: JSON.stringify(plans) },
      create: { key: 'pricing_plans', value: JSON.stringify(plans) },
    });

    return res.status(200).json({ plans });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
