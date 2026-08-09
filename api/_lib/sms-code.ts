import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export const MAX_SMS_VERIFY_ATTEMPTS = 5;

export interface SmsRateCounts {
  phoneMinute: number;
  phoneDay: number;
  ipHour: number;
  ipDay: number;
}

export function getSmsRateLimitViolation(counts: SmsRateCounts): string | null {
  if (counts.phoneMinute >= 1) return '发送太频繁，请60秒后再试';
  if (counts.phoneDay >= 10) return '该手机号今日发送次数已达上限，请明天再试';
  if (counts.ipHour >= 20) return '当前网络请求过于频繁，请稍后再试';
  if (counts.ipDay >= 100) return '当前网络今日请求次数已达上限';
  return null;
}

function getSecret(): string {
  const value = process.env.SMS_CODE_SECRET?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === 'production') throw new Error('SMS_CODE_SECRET is required');
  return 'paperfix-development-sms-secret';
}

export function generateSmsCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashSmsCode(phone: string, code: string): string {
  return createHmac('sha256', getSecret()).update(`v1:${phone}:${code}`).digest('hex');
}

export function matchesSmsCode(phone: string, code: string, digest: string): boolean {
  if (!/^[a-f\d]{64}$/i.test(digest)) return false;
  const expected = Buffer.from(hashSmsCode(phone, code), 'hex');
  const actual = Buffer.from(digest, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
