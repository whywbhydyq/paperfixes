import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { refundJobOnce, refundTimedOutJob } from '../api/_lib/job-refund';
import { createRefundClient } from './helpers/refund-client';

const now = new Date('2026-08-09T00:00:00.000Z');
const fixture = {
  job: { id: 'j1', userId: 'u1', status: 'PROCESSING' },
  user: { id: 'u1', quota: 2, totalUsed: 4 },
};

it('refunds one quota exactly once under concurrency', async () => {
  const client = createRefundClient(structuredClone(fixture));
  const results = await Promise.all([
    refundTimedOutJob('j1', 'u1', now, client),
    refundTimedOutJob('j1', 'u1', now, client),
  ]);
  expect(results.sort()).toEqual([false, true]);
  expect(client.state.user).toMatchObject({ quota: 3, totalUsed: 3 });
  expect(client.state.job.status).toBe('FAILED');
  expect(client.state.job.error).toBe('处理超时，额度已退还');
});

it('does not refund another users job', async () => {
  const client = createRefundClient(structuredClone(fixture));
  expect(await refundTimedOutJob('j1', 'attacker', now, client)).toBe(false);
  expect(client.state.user.quota).toBe(fixture.user.quota);
  expect(client.state.job.status).toBe('PROCESSING');
});

it('rolls back the job transition if the user usage state is invalid', async () => {
  const client = createRefundClient({
    job: { id: 'j1', userId: 'u1', status: 'PENDING' },
    user: { id: 'u1', quota: 0, totalUsed: 0 },
  });
  await expect(refundJobOnce({
    jobId: 'j1', userId: 'u1', error: 'AI failed', now,
  }, client)).rejects.toThrow('REFUND_USER_STATE_INVALID');
  expect(client.state.job.status).toBe('PENDING');
  expect(client.state.user.quota).toBe(0);
});

it('does not refund a completed job', async () => {
  const client = createRefundClient({
    job: { id: 'j1', userId: 'u1', status: 'DONE' },
    user: { id: 'u1', quota: 2, totalUsed: 4 },
  });
  expect(await refundJobOnce({
    jobId: 'j1', userId: 'u1', error: 'late failure', now,
  }, client)).toBe(false);
  expect(client.state.user).toMatchObject({ quota: 2, totalUsed: 4 });
});

it('keeps refunds and completion behind conditional state transitions', () => {
  const source = readFileSync('api/rewrite/status/[jobId].ts', 'utf8');
  expect(source).toContain('refundTimedOutJob');
  expect(source).toContain('refundJobOnce');
  expect(source).toContain("status: 'PROCESSING'");
  expect(source).toMatch(/completed\.count\s*!==\s*1/);
  expect(source).not.toMatch(/prisma\.user\.update/);
});
