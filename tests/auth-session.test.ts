import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createExpiredSessionCookie,
  createSessionCookie,
  getUserFromRequest,
  signToken,
} from '../api/_lib/auth';
import { toPublicUser } from '../api/_lib/user-view';
import phoneLoginHandler from '../api/auth/phone-login';

afterEach(() => vi.unstubAllEnvs());

describe('session cookies', () => {
  it('uses the HttpOnly cookie before a bearer token', () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    const cookieToken = signToken('cookie-user');
    const bearerToken = signToken('bearer-user');
    const userId = getUserFromRequest({
      headers: {
        cookie: `paperfix_session=${encodeURIComponent(cookieToken)}`,
        authorization: `Bearer ${bearerToken}`,
      },
    });
    expect(userId).toBe('cookie-user');
  });

  it('keeps bearer compatibility when no cookie exists', () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    const userId = getUserFromRequest({
      headers: { authorization: `Bearer ${signToken('legacy-user')}` },
    });
    expect(userId).toBe('legacy-user');
  });

  it('falls back to bearer when a stale cookie is invalid', () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    const userId = getUserFromRequest({
      headers: {
        cookie: 'paperfix_session=stale',
        authorization: `Bearer ${signToken('legacy-user')}`,
      },
    });
    expect(userId).toBe('legacy-user');
  });

  it('sets and clears a secure production cookie', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const cookie = createSessionCookie('signed-token');
    expect(cookie).toContain('paperfix_session=signed-token');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=2592000');
    expect(createExpiredSessionCookie()).toContain('Max-Age=0');
  });

  it('clears the browser cookie through the logout endpoint', async () => {
    const headers = new Map<string, string>();
    const response = {
      setHeader: (name: string, value: string) => headers.set(name, value),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    await phoneLoginHandler(
      { method: 'POST', query: { operation: 'logout' } } as any,
      response as any,
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});

it('serializes only safe public user fields', () => {
  const result = toPublicUser({
    id: 'u1',
    email: null,
    phone: '13800138000',
    passwordHash: 'private-hash',
    wechatOpenId: null,
    wechatName: null,
    wechatAvatar: null,
    role: 'user',
    plan: 'basic',
    quota: 5,
    totalUsed: 1,
    planExpiresAt: new Date('2026-09-08T00:00:00.000Z'),
    createdAt: new Date('2026-08-09T00:00:00.000Z'),
  });

  expect(result.planExpiresAt).toBe('2026-09-08T00:00:00.000Z');
  expect(result.hasPassword).toBe(true);
  expect(result).not.toHaveProperty('passwordHash');
  expect(result).not.toHaveProperty('wechatOpenId');
  expect(result).not.toHaveProperty('token');
});

it('does not reveal whether a phone account exists', () => {
  const source = readFileSync('api/auth/phone-login.ts', 'utf8');
  expect(source).not.toContain('手机号未注册');
  expect(source).not.toContain('该账号尚未设置密码');
  expect(source).toContain('手机号或密码错误');
});

it('login routes set the session cookie and return the safe user view', () => {
  for (const file of ['api/auth/sms.ts', 'api/auth/phone-login.ts']) {
    const source = readFileSync(file, 'utf8');
    expect(source).toContain('setSessionCookie(res, token)');
    expect(source).toContain('toPublicUser(');
  }
});
