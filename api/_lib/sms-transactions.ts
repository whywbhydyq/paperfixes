import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import {
  getSmsRateLimitViolation,
  matchesSmsCode,
  MAX_SMS_VERIFY_ATTEMPTS,
} from './sms-code.js';

function lockIdentity(kind: 'phone' | 'ip', value: string): string {
  const digest = createHash('sha256').update(value).digest('hex');
  return `paperfix:sms:${kind}:${digest}`;
}

async function acquireTransactionLocks(
  tx: Prisma.TransactionClient,
  identities: string[],
): Promise<void> {
  const sorted = [...new Set(identities)].sort();
  for (const identity of sorted) {
    // The identity is a bound value, never interpolated SQL. Transaction-level
    // advisory locks are automatically released on commit or rollback.
    const acquired = await tx.$queryRaw<Array<{ lockResult: string }>>(Prisma.sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${identity}::text, 0::bigint)
      )::text AS "lockResult"
    `);
    if (acquired.length !== 1) throw new Error('SMS_ADVISORY_LOCK_FAILED');
  }
}

export type SmsReservation =
  | { kind: 'reserved'; id: string }
  | { kind: 'rate-limited'; message: string };

export async function reserveSmsCode(
  client: PrismaClient,
  input: {
    phone: string;
    requestIp: string;
    digest: string;
    now: Date;
    expiresAt: Date;
  },
): Promise<SmsReservation> {
  return client.$transaction(async (tx) => {
    await acquireTransactionLocks(tx, [
      lockIdentity('phone', input.phone),
      lockIdentity('ip', input.requestIp),
    ]);

    const pendingReservation = await tx.smsCode.count({
      where: {
        phone: input.phone,
        used: true,
        attempts: MAX_SMS_VERIFY_ATTEMPTS,
        expiresAt: { gt: input.now },
      },
    });
    if (pendingReservation > 0) {
      return { kind: 'rate-limited', message: '验证码正在发送，请稍后再试' };
    }

    const minuteAgo = new Date(input.now.getTime() - 60 * 1000);
    const hourAgo = new Date(input.now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(input.now.getTime() - 24 * 60 * 60 * 1000);
    const [phoneMinute, phoneDay, ipHour, ipDay] = await Promise.all([
      tx.smsCode.count({ where: { phone: input.phone, createdAt: { gt: minuteAgo } } }),
      tx.smsCode.count({ where: { phone: input.phone, createdAt: { gt: dayAgo } } }),
      tx.smsCode.count({ where: { requestIp: input.requestIp, createdAt: { gt: hourAgo } } }),
      tx.smsCode.count({ where: { requestIp: input.requestIp, createdAt: { gt: dayAgo } } }),
    ]);
    const violation = getSmsRateLimitViolation({ phoneMinute, phoneDay, ipHour, ipDay });
    if (violation) return { kind: 'rate-limited', message: violation };

    const row = await tx.smsCode.create({
      data: {
        phone: input.phone,
        code: input.digest,
        requestIp: input.requestIp,
        expiresAt: input.expiresAt,
        // A reservation is intentionally unverifiable until the provider has
        // acknowledged delivery and activation commits.
        used: true,
        attempts: MAX_SMS_VERIFY_ATTEMPTS,
      },
      select: { id: true },
    });
    return { kind: 'reserved', id: row.id };
  });
}

export async function activateSmsReservation(
  client: PrismaClient,
  input: { id: string; phone: string; now: Date },
): Promise<boolean> {
  return client.$transaction(async (tx) => {
    await acquireTransactionLocks(tx, [lockIdentity('phone', input.phone)]);

    const activated = await tx.smsCode.updateMany({
      where: {
        id: input.id,
        phone: input.phone,
        used: true,
        attempts: MAX_SMS_VERIFY_ATTEMPTS,
        expiresAt: { gt: input.now },
      },
      data: { used: false, attempts: 0 },
    });
    if (activated.count !== 1) return false;

    await tx.smsCode.updateMany({
      where: {
        phone: input.phone,
        id: { not: input.id },
        used: false,
      },
      data: { used: true },
    });
    return true;
  });
}

export async function expireSmsReservation(
  client: PrismaClient,
  input: { id: string; phone: string; now: Date },
): Promise<boolean> {
  const expired = await client.smsCode.updateMany({
    where: {
      id: input.id,
      phone: input.phone,
      used: true,
      attempts: MAX_SMS_VERIFY_ATTEMPTS,
    },
    data: { expiresAt: input.now },
  });
  return expired.count === 1;
}

interface LockedSmsCode {
  id: string;
  code: string;
  attempts: number;
}

export class SmsVerificationConfigurationError extends Error {
  constructor() {
    super('SMS_VERIFICATION_NOT_CONFIGURED');
    this.name = 'SmsVerificationConfigurationError';
  }
}

export async function verifyAndConsumeSmsCode(
  client: PrismaClient,
  input: { phone: string; candidate: string },
): Promise<'matched' | 'rejected'> {
  return client.$transaction(async (tx) => {
    await acquireTransactionLocks(tx, [lockIdentity('phone', input.phone)]);
    const rows = await tx.$queryRaw<LockedSmsCode[]>(Prisma.sql`
      SELECT "id", "code", "attempts"
      FROM "SmsCode"
      WHERE "phone" = ${input.phone}
        AND "used" = false
        AND "expiresAt" > clock_timestamp()
        AND "attempts" < CAST(${MAX_SMS_VERIFY_ATTEMPTS} AS INTEGER)
      ORDER BY "createdAt" DESC
      LIMIT 1
      FOR UPDATE
    `);
    const smsCode = rows[0];
    if (!smsCode) return 'rejected';

    let matches: boolean;
    try {
      // This comparison happens while the selected row is locked, so every
      // guess must observe the attempt committed by the preceding guess.
      matches = matchesSmsCode(input.phone, input.candidate, smsCode.code);
    } catch {
      throw new SmsVerificationConfigurationError();
    }

    if (!matches) {
      const exhausted = smsCode.attempts + 1 >= MAX_SMS_VERIFY_ATTEMPTS;
      const updated = await tx.smsCode.updateMany({
        where: {
          id: smsCode.id,
          used: false,
          attempts: smsCode.attempts,
        },
        data: {
          attempts: { increment: 1 },
          ...(exhausted ? { used: true } : {}),
        },
      });
      if (updated.count !== 1) throw new Error('SMS_VERIFICATION_STATE_CONFLICT');
      return 'rejected';
    }

    const consumed = await tx.smsCode.updateMany({
      where: {
        id: smsCode.id,
        used: false,
        attempts: smsCode.attempts,
      },
      data: { used: true },
    });
    if (consumed.count !== 1) throw new Error('SMS_VERIFICATION_STATE_CONFLICT');
    return 'matched';
  });
}
