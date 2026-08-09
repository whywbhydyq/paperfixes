import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  getClientIp,
  isAllowedBrowserOrigin,
  rejectCrossOriginMutation,
} from '../api/_lib/http-security';

describe('same-origin protection', () => {
  it('accepts the request host and rejects an unrelated origin', () => {
    const base = { headers: { host: 'www.paperfixes.com', 'x-forwarded-proto': 'https' } };
    expect(isAllowedBrowserOrigin({
      headers: { ...base.headers, origin: 'https://www.paperfixes.com' },
    })).toBe(true);
    expect(isAllowedBrowserOrigin({
      headers: { ...base.headers, origin: 'https://evil.example' },
    })).toBe(false);
    expect(isAllowedBrowserOrigin({
      headers: { ...base.headers, origin: 'not a URL' },
    })).toBe(false);
  });

  it('uses the first forwarded client IP', () => {
    expect(getClientIp({ headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } }))
      .toBe('203.0.113.7');
  });

  it('sends 403 and reports that it handled a cross-origin mutation', () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const blocked = rejectCrossOriginMutation(
      { headers: { host: 'paperfixes.com', origin: 'https://evil.example' } },
      { status } as never,
    );
    expect(blocked).toBe(true);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: '请求来源无效' });
  });
});

it('configures security headers without wildcard CORS', () => {
  const vercel = readFileSync('vercel.json', 'utf8');
  const html = readFileSync('index.html', 'utf8');
  expect(vercel).toContain('Content-Security-Policy');
  expect(vercel).toContain('Strict-Transport-Security');
  expect(vercel).toContain('X-Content-Type-Options');
  expect(vercel).toContain('Cache-Control');
  expect(vercel).not.toContain('Access-Control-Allow-Origin');
  expect(vercel).not.toContain('Access-Control-Allow-Credentials');
  expect(html).not.toContain('push.zhanzhang.baidu.com');
});

it('guards browser mutation routes but exempts the signed payment callback', () => {
  const guarded = [
    'api/auth/sms.ts',
    'api/auth/phone-login.ts',
    'api/auth/set-password.ts',
    'api/auth/logout.ts',
    'api/user/index.ts',
    'api/admin/index.ts',
    'api/payment/create.ts',
    'api/rewrite/submit.ts',
  ];
  for (const file of guarded) {
    expect(readFileSync(file, 'utf8'), file).toContain('rejectCrossOriginMutation');
  }
  expect(readFileSync('api/payment/notify.ts', 'utf8'))
    .not.toContain('rejectCrossOriginMutation');
});
