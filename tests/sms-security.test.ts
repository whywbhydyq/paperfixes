import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateSmsCode,
  getSmsRateLimitViolation,
  hashSmsCode,
  matchesSmsCode,
  MAX_SMS_VERIFY_ATTEMPTS,
} from '../api/_lib/sms-code';
import { getClientIp } from '../api/_lib/http-security';
import { sendSms } from '../api/_lib/sms';

afterEach(() => vi.unstubAllEnvs());

describe('SMS codes', () => {
  it('always generates exactly six numeric characters', () => {
    for (let i = 0; i < 200; i += 1) expect(generateSmsCode()).toMatch(/^\d{6}$/);
  });

  it('stores an HMAC digest, not the plaintext code', () => {
    vi.stubEnv('SMS_CODE_SECRET', 'test-sms-secret');
    const digest = hashSmsCode('13800138000', '012345');
    expect(digest).toMatch(/^[a-f\d]{64}$/);
    expect(digest).not.toContain('012345');
    expect(matchesSmsCode('13800138000', '012345', digest)).toBe(true);
    expect(matchesSmsCode('13800138000', '999999', digest)).toBe(false);
    expect(matchesSmsCode('13800138000', '012345', 'malformed')).toBe(false);
  });

  it('fails closed in production without provider credentials', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALIYUN_ACCESS_KEY_ID', '');
    vi.stubEnv('ALIYUN_ACCESS_KEY_SECRET', '');
    await expect(sendSms('13800138000', '012345')).rejects.toThrow(
      'SMS provider is not configured',
    );
  });

  it('enforces phone, IP, and five-attempt limits', () => {
    expect(MAX_SMS_VERIFY_ATTEMPTS).toBe(5);
    expect(getSmsRateLimitViolation({ phoneMinute: 1, phoneDay: 1, ipHour: 1, ipDay: 1 }))
      .toBe('发送太频繁，请60秒后再试');
    expect(getSmsRateLimitViolation({ phoneMinute: 0, phoneDay: 10, ipHour: 1, ipDay: 1 }))
      .toBe('该手机号今日发送次数已达上限，请明天再试');
    expect(getSmsRateLimitViolation({ phoneMinute: 0, phoneDay: 1, ipHour: 20, ipDay: 20 }))
      .toBe('当前网络请求过于频繁，请稍后再试');
    expect(getSmsRateLimitViolation({ phoneMinute: 0, phoneDay: 1, ipHour: 1, ipDay: 100 }))
      .toBe('当前网络今日请求次数已达上限');
  });

  it('uses the first forwarded address and strips whitespace', () => {
    expect(getClientIp({ headers: { 'x-forwarded-for': ' 203.0.113.7, 10.0.0.2 ' } } as never))
      .toBe('203.0.113.7');
    expect(getClientIp({ headers: {}, socket: { remoteAddress: '127.0.0.1' } } as never))
      .toBe('127.0.0.1');
  });

  it('keeps plaintext codes out of persistence and bounds each verification row', () => {
    const handlerSource = readFileSync('api/auth/sms.ts', 'utf8');
    const transactionSource = readFileSync('api/_lib/sms-transactions.ts', 'utf8');
    const source = `${handlerSource}\n${transactionSource}`;
    expect(source).not.toMatch(/Math\.random|code:\s*newCode|smsCode\.code\s*!==\s*code/);
    expect(source).toContain('hashSmsCode(phone, newCode)');
    expect(transactionSource).toContain('FOR UPDATE');
    expect(transactionSource).toContain('MAX_SMS_VERIFY_ATTEMPTS');
    expect(transactionSource).toContain("data: { used: true }");
    expect(source).toContain('requestIp');
  });
});
