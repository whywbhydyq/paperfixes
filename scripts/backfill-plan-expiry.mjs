const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function calculateBackfillExpiry(deploymentAt) {
  if (!(deploymentAt instanceof Date) || Number.isNaN(deploymentAt.getTime())) {
    throw new Error('PLAN_EXPIRY_BACKFILL_AT must be a valid ISO timestamp');
  }
  return new Date(deploymentAt.getTime() + THIRTY_DAYS_MS);
}

export async function runBackfill({ apply, deploymentAt, client }) {
  const expiresAt = calculateBackfillExpiry(deploymentAt);
  const where = { plan: { not: 'free' }, planExpiresAt: null };
  const candidates = await client.user.count({ where });
  const updated = apply
    ? (await client.user.updateMany({ where, data: { planExpiresAt: expiresAt } })).count
    : 0;
  return { candidates, updated, expiresAt };
}

async function main() {
  const value = process.env.PLAN_EXPIRY_BACKFILL_AT;
  if (!value) {
    throw new Error('Set PLAN_EXPIRY_BACKFILL_AT to the fixed deployment ISO timestamp');
  }

  const { PrismaClient } = await import('@prisma/client');
  const client = new PrismaClient();
  try {
    const apply = process.argv.includes('--apply');
    const result = await runBackfill({
      apply,
      deploymentAt: new Date(value),
      client,
    });
    console.log(JSON.stringify(result, null, 2));
    if (!apply) console.log('Dry run only; pass --apply to write.');
  } finally {
    await client.$disconnect();
  }
}

if (process.argv[1]?.endsWith('backfill-plan-expiry.mjs')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
