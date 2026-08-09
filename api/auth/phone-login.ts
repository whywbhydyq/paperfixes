import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import {
  clearSessionCookie,
  comparePassword,
  setSessionCookie,
  signToken,
} from '../_lib/auth.js';
import { enforcePlanExpiry } from '../_lib/plan-entitlements.js';
import { toPublicUser } from '../_lib/user-view.js';
import { rejectCrossOriginMutation } from '../_lib/http-security.js';

const DUMMY_PASSWORD_HASH = '$2b$10$MHQjQoIJVN9fvWe6wJ6NU.KMzSXKnNb9MPC2v2XkWas8XtoXqsN.e';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (rejectCrossOriginMutation(req, res)) return;

  if (req.query.operation === 'logout') {
    clearSessionCookie(res);
    return res.status(200).json({ success: true });
  }

  const { phone, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: '请输入手机号和密码' });

  const user = await prisma.user.findUnique({ where: { phone } });
  const valid = await comparePassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user?.passwordHash || !valid) {
    return res.status(400).json({ error: '手机号或密码错误' });
  }

  const currentUser = await enforcePlanExpiry(user.id);
  const token = signToken(currentUser.id);
  setSessionCookie(res, token);

  return res.status(200).json({
    user: toPublicUser(currentUser),
  });
}
