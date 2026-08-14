import { createHash } from 'node:crypto';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const STRICT_UTC_MILLISECOND_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SHA256_HEX = /^[a-f0-9]{64}$/;

class BackfillError extends Error {
  constructor(code, message) {
    super(code);
    this.name = 'BackfillError';
    this.code = code;
    this.safeMessage = message;
  }
}

function fail(code, message) {
  throw new BackfillError(code, message);
}

export function parseBackfillTimestamp(value) {
  if (typeof value !== 'string' || !STRICT_UTC_MILLISECOND_ISO.test(value)) {
    fail('BACKFILL_TIMESTAMP_INVALID', 'Backfill timestamp must be canonical UTC with milliseconds.');
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    fail('BACKFILL_TIMESTAMP_INVALID', 'Backfill timestamp must be canonical UTC with milliseconds.');
  }
  return parsed;
}

export function calculateBackfillExpiry(timestamp) {
  const deploymentAt = parseBackfillTimestamp(timestamp);
  return new Date(deploymentAt.getTime() + THIRTY_DAYS_MS);
}

export function calculateCandidateDigest(candidates) {
  const canonical = [...candidates]
    .map(({ id, plan }) => ({ id, plan }))
    .sort((a, b) => a.id.localeCompare(b.id) || a.plan.localeCompare(b.plan));
  return createHash('sha256').update(JSON.stringify(canonical), 'utf8').digest('hex');
}

function parseAuthoritativePlans(config) {
  if (!config || typeof config.value !== 'string') {
    fail('BACKFILL_PLAN_CONFIG_INVALID', 'Authoritative pricing plan configuration is invalid.');
  }
  let plans;
  try {
    plans = JSON.parse(config.value);
  } catch {
    fail('BACKFILL_PLAN_CONFIG_INVALID', 'Authoritative pricing plan configuration is invalid.');
  }
  if (!Array.isArray(plans) || plans.length === 0) {
    fail('BACKFILL_PLAN_CONFIG_INVALID', 'Authoritative pricing plan configuration is invalid.');
  }
  const keys = new Set();
  let freeCount = 0;
  for (const plan of plans) {
    if (!plan || typeof plan !== 'object'
      || typeof plan.planKey !== 'string'
      || !plan.planKey.trim()
      || plan.planKey !== plan.planKey.trim()
      || keys.has(plan.planKey)
      || typeof plan.name !== 'string'
      || !plan.name.trim()
      || typeof plan.active !== 'boolean'
      || typeof plan.popular !== 'boolean'
      || !Number.isSafeInteger(plan.quota)
      || plan.quota <= 0
      || !Number.isFinite(plan.price)
      || plan.price < 0
      || !Number.isSafeInteger(plan.minChars)
      || plan.minChars <= 0
      || !Number.isSafeInteger(plan.maxChars)
      || plan.maxChars < plan.minChars
      || !Array.isArray(plan.features)
      || plan.features.some((feature) => typeof feature !== 'string')
      || !Number.isSafeInteger(plan.sortOrder)) {
      fail('BACKFILL_PLAN_CONFIG_INVALID', 'Authoritative pricing plan configuration is invalid.');
    }
    keys.add(plan.planKey);
    if (plan.planKey === 'free') {
      freeCount += 1;
      if (!plan.active || plan.price !== 0 || plan.quota !== 3) {
        fail('BACKFILL_PLAN_CONFIG_INVALID', 'Authoritative pricing plan configuration is invalid.');
      }
    }
  }
  if (freeCount !== 1) {
    fail('BACKFILL_PLAN_CONFIG_INVALID', 'Authoritative pricing plan configuration is invalid.');
  }
  return new Set(plans
    .filter((plan) => plan.active && plan.planKey !== 'free')
    .map((plan) => plan.planKey));
}

function summarizeCandidates(candidates, validPaidPlanKeys) {
  const planCounts = {};
  for (const candidate of candidates) {
    if (!candidate || typeof candidate.id !== 'string' || !candidate.id
      || typeof candidate.plan !== 'string'
      || !candidate.plan.trim()
      || candidate.plan === 'free'
      || !validPaidPlanKeys.has(candidate.plan)) {
      fail('BACKFILL_CANDIDATE_PLAN_INVALID', 'Candidate plans do not match active paid plan configuration.');
    }
    planCounts[candidate.plan] = (planCounts[candidate.plan] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(planCounts).sort(([a], [b]) => a.localeCompare(b)));
}

function validateApplyExpectation(expectedCount, expectedDigest, actualCount, actualDigest) {
  if (!Number.isSafeInteger(expectedCount) || expectedCount < 0) {
    fail('BACKFILL_EXPECTED_COUNT_INVALID', 'Expected candidate count is required for apply.');
  }
  if (expectedCount === 0) {
    fail('BACKFILL_EMPTY_APPLY_FORBIDDEN', 'Applying an empty candidate set is forbidden.');
  }
  if (typeof expectedDigest !== 'string' || !SHA256_HEX.test(expectedDigest)) {
    fail('BACKFILL_EXPECTED_DIGEST_INVALID', 'Expected candidate digest is required for apply.');
  }
  if (expectedCount !== actualCount || expectedDigest !== actualDigest) {
    fail('BACKFILL_EXPECTATION_MISMATCH', 'Candidate evidence changed; run dry-run again.');
  }
}

export async function runBackfill({
  apply,
  timestamp,
  expectedCount,
  expectedDigest,
  client,
}) {
  const expiresAt = calculateBackfillExpiry(timestamp);

  return client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(802411337)`;
    const config = await tx.config.findUnique({ where: { key: 'pricing_plans' } });
    const validPaidPlanKeys = parseAuthoritativePlans(config);
    const candidates = await tx.$queryRaw`
      SELECT "id", "plan"
      FROM "User"
      WHERE "plan" <> 'free' AND "planExpiresAt" IS NULL
      ORDER BY "id"
      FOR UPDATE
    `;
    const planCounts = summarizeCandidates(candidates, validPaidPlanKeys);
    const digest = calculateCandidateDigest(candidates);
    const candidateCount = candidates.length;

    if (!apply) {
      return {
        candidates: candidateCount,
        updated: 0,
        planCounts,
        digest,
        expiresAt,
      };
    }

    validateApplyExpectation(expectedCount, expectedDigest, candidateCount, digest);
    const candidateIds = candidates.map(({ id }) => id);
    const updateResult = await tx.user.updateMany({
      where: { id: { in: candidateIds }, planExpiresAt: null },
      data: { planExpiresAt: expiresAt },
    });
    if (updateResult.count !== expectedCount) {
      fail('BACKFILL_UPDATE_COUNT_MISMATCH', 'Updated row count did not match expected count.');
    }
    return {
      candidates: candidateCount,
      updated: updateResult.count,
      planCounts,
      digest,
      expiresAt,
    };
  });
}

export function toSafeBackfillError(error) {
  if (error instanceof BackfillError) {
    return { code: error.code, message: error.safeMessage };
  }
  return {
    code: 'BACKFILL_FAILED',
    message: 'Backfill failed safely; inspect restricted logs.',
  };
}

function readExpectedCount(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return undefined;
  const count = Number(value);
  return Number.isSafeInteger(count) ? count : undefined;
}

async function main() {
  const timestamp = process.env.PLAN_EXPIRY_BACKFILL_AT;
  const apply = process.argv.includes('--apply');
  const expectedCount = readExpectedCount(process.env.PLAN_EXPIRY_BACKFILL_EXPECTED_COUNT);
  const expectedDigest = process.env.PLAN_EXPIRY_BACKFILL_EXPECTED_DIGEST;
  const { PrismaClient } = await import('@prisma/client');
  const client = new PrismaClient();
  try {
    const result = await runBackfill({
      apply,
      timestamp,
      expectedCount,
      expectedDigest,
      client,
    });
    console.log(JSON.stringify(result, null, 2));
    if (!apply) console.log('Dry run only; record candidates and digest before apply.');
  } finally {
    await client.$disconnect();
  }
}

if (process.argv[1]?.endsWith('backfill-plan-expiry.mjs')) {
  main().catch((error) => {
    console.error(JSON.stringify(toSafeBackfillError(error)));
    process.exitCode = 1;
  });
}
