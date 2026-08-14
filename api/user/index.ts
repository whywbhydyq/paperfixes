// api/user/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';
import { enforcePlanExpiry } from '../_lib/plan-entitlements.js';
import { rejectCrossOriginMutation } from '../_lib/http-security.js';
import { redeemPlanCode } from '../_lib/redemption-code.js';
import { PLAN_CHANGE_REQUIRES_EXPIRY_CODE } from '../_lib/plan-credit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && rejectCrossOriginMutation(req, res)) return;
  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '请先登录' });

  const currentUser = await enforcePlanExpiry(userId).catch((error: unknown) => {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') return null;
    throw error;
  });
  if (!currentUser) return res.status(404).json({ error: '用户不存在' });

  const { action } = req.query;

  // GET /api/user?action=quota
  if (req.method === 'GET' && action === 'quota') {
    return res.status(200).json({
      quota: currentUser.quota,
      totalUsed: currentUser.totalUsed,
      plan: currentUser.plan,
      planExpiresAt: currentUser.planExpiresAt?.toISOString() ?? null,
    });
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

  // POST /api/user?action=redeem
  if (req.method === 'POST' && action === 'redeem') {
    const { code } = req.body || {};
    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ success: false, error: '请输入兑换码' });
    }

    try {
      const result = await redeemPlanCode({ userId, code });
      return res.status(200).json({
        success: true,
        status: result.status,
        redemption: result.redemption,
        entitlements: {
          plan: result.user.plan,
          quota: result.user.quota,
          planExpiresAt: result.user.planExpiresAt?.toISOString() ?? null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'REDEMPTION_CODE_INVALID') {
        return res.status(400).json({ success: false, error: '兑换码格式错误或不存在' });
      }
      if (message === 'REDEMPTION_CODE_USED') {
        return res.status(409).json({ success: false, error: '兑换码已被其他账号使用' });
      }
      if (message === 'REDEMPTION_CODE_EXPIRED') {
        return res.status(410).json({ success: false, error: '兑换码已过期' });
      }
      if (message === PLAN_CHANGE_REQUIRES_EXPIRY_CODE) {
        return res.status(409).json({
          success: false,
          error: '当前付费套餐有效期内只能兑换同一套餐',
          code: PLAN_CHANGE_REQUIRES_EXPIRY_CODE,
        });
      }
      throw error;
    }
  }

  // POST /api/user?action=password
  if (req.method === 'POST' && action === 'password') {
    const { comparePassword, hashPassword } = await import('../_lib/auth.js');
    const { oldPassword, newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '新密码至少 6 位' });
    }
    if (currentUser.passwordHash) {
      if (!oldPassword) return res.status(400).json({ error: '请输入当前密码' });
      const valid = await comparePassword(oldPassword, currentUser.passwordHash);
      if (!valid) return res.status(400).json({ error: '当前密码不正确' });
    }
    const newHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
