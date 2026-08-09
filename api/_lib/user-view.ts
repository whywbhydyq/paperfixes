import type { User } from '@prisma/client';

export function toPublicUser(user: User) {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    wechatName: user.wechatName,
    role: user.role,
    plan: user.plan,
    quota: user.quota,
    totalUsed: user.totalUsed,
    hasPassword: Boolean(user.passwordHash),
    planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
  };
}
