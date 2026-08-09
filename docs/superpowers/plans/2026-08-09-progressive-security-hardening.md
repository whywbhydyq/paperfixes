# PaperFix Progressive Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留数据库原文、结果和历史记录的前提下，把 PaperFix 的套餐有效期、会话、短信、HTTP 安全、支付入账和任务退款改成服务端可验证、并发安全且与页面文案一致的实现。

**Architecture:** 先用 additive Prisma migration 增加服务端到期日、验证码尝试次数/IP 和支付流水号，再把套餐到期、Cookie 会话、验证码、支付结算、任务退款分别收敛到小型服务模块。所有状态变更由服务端执行，前端只保存非敏感展示状态；旧 Bearer Token 仅保留读取兼容，生产数据回填使用默认 dry-run、显式 `--apply` 的独立脚本。

**Tech Stack:** React 19、Vite 7、TypeScript 5.9、Zustand 5、Vercel Node Functions、Prisma 6、PostgreSQL、Vitest 3。

## Global Constraints

- 必须保留 `Job.inputText`、`Job.outputText`、最近 50 条历史记录、订单和充值记录。
- 不添加自动删除、历史删除接口、术语验证器、字数 ±5% 验证器或 AI 率验证器。
- 所有付费套餐固定 30 天；有效期内续购从当前 `planExpiresAt` 叠加 30 天，已过期续购从付款时间叠加 30 天。
- 到期后服务端必须原子设置 `plan = "free"`、`quota = 0`、`planExpiresAt = null`。
- 旧付费用户的空到期日只通过显式回填脚本设置为“固定上线时间 + 30 天”，不得自动连接或修改生产数据库。
- 新前端不得把 JWT、论文原文、处理结果或前端计算的套餐到期时间写入 localStorage。
- 支付入账必须验证商户、订单号、平台流水号和金额，并在一个 Prisma interactive transaction 内完成。
- 所有生产代码修改必须先有会失败的测试；每一任务完成后运行聚焦测试并提交。
- 不修改 `api/_lib/ai.ts` 的模型、提示词或产品算法逻辑。

---

## File Structure

### New files

- `vitest.config.ts`：Node 环境测试配置。
- `tests/schema-and-backfill.test.ts`：数据模型、migration 和显式回填脚本的安全约束。
- `tests/plan-entitlements.test.ts`：30 天计算、到期清零和并发条件更新。
- `tests/auth-session.test.ts`：Cookie 优先、Bearer 兼容、Cookie 属性和登出清除。
- `tests/auth-store.test.ts`：前端持久化白名单不包含 Token 或正文。
- `tests/sms-security.test.ts`：验证码生成、HMAC、恒定时间比较及生产配置失败关闭。
- `tests/http-security.test.ts`：同源判断和 Vercel 安全头配置。
- `tests/order-settlement.test.ts`：支付金额验证、单次入账、30 天叠加和事务回滚。
- `tests/job-refund.test.ts`：任务失败只退款一次、非所有者不退款。
- `tests/copy-policy.test.ts`：禁止虚假留存、零修改、±5% 和永久有效文案。
- `tests/helpers/plan-client.ts`：套餐条件更新的内存测试客户端。
- `tests/helpers/settlement-client.ts`：带串行事务和失败回滚的支付内存测试客户端。
- `tests/helpers/refund-client.ts`：带串行事务和失败回滚的退款内存测试客户端。
- `api/_lib/plan-entitlements.ts`：套餐到期计算、单用户/批量到期执行。
- `api/_lib/user-view.ts`：唯一的前端安全用户字段序列化器。
- `api/_lib/http-security.ts`：浏览器同源检查和客户端 IP 提取。
- `api/_lib/sms-code.ts`：六位验证码、HMAC 摘要和恒定时间验证。
- `api/_lib/order-settlement.ts`：支付订单单事务结算。
- `api/_lib/job-refund.ts`：任务状态条件更新与单次退款。
- `api/auth/logout.ts`：清除 HttpOnly 会话 Cookie。
- `prisma/migrations/20260809000000_security_hardening/migration.sql`：仅新增列和索引。
- `scripts/backfill-plan-expiry.mjs`：旧付费用户到期日 dry-run/显式回填。
- `docs/deployment/security-hardening-rollout.md`：迁移、回填、部署、验证和应用回滚步骤。

### Existing files to modify

- `package.json`、`package-lock.json`、`prisma/schema.prisma`
- `api/_lib/auth.ts`、`api/_lib/sms.ts`
- `api/auth/sms.ts`、`api/auth/phone-login.ts`、`api/auth/set-password.ts`
- `api/user/index.ts`、`api/admin/index.ts`
- `api/payment/create.ts`、`api/payment/notify.ts`、`api/payment/status.ts`
- `api/rewrite/submit.ts`、`api/rewrite/status/[jobId].ts`
- `src/store/useAuthStore.ts`、`src/lib/api.ts`、`src/App.tsx`
- `src/components/LoginModal.tsx`、`src/components/Navbar.tsx`、`src/components/JobPoller.tsx`、`src/components/PaymentModal.tsx`、`src/components/Footer.tsx`
- `src/pages/ReducePage.tsx`、`src/pages/PricingPage.tsx`、`src/pages/DashboardPage.tsx`、`src/pages/AdminPage.tsx`
- `src/pages/HomePage.tsx`、`src/pages/FaqPage.tsx`、`src/pages/PrivacyPage.tsx`、`src/pages/TermsPage.tsx`、`src/data/articles.ts`
- `index.html`、`vercel.json`

---

### Task 1: Test Harness, Additive Schema, and Explicit Legacy Backfill

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `prisma/schema.prisma`
- Create: `vitest.config.ts`
- Create: `tests/schema-and-backfill.test.ts`
- Create: `prisma/migrations/20260809000000_security_hardening/migration.sql`
- Create: `scripts/backfill-plan-expiry.mjs`

**Interfaces:**
- Produces: `User.planExpiresAt: Date | null`, `SmsCode.attempts: number`, `SmsCode.requestIp: string | null`, `Order.providerTradeNo: string | null`.
- Produces: `calculateBackfillExpiry(deploymentAt: Date): Date` and `runBackfill({ apply, deploymentAt, client }): Promise<{ candidates: number; updated: number; expiresAt: Date }>`.

- [ ] **Step 1: Install and configure Vitest**

Run:

```powershell
npm.cmd install --save-dev vitest@^3.2.4
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "db:backfill-plan-expiry": "node scripts/backfill-plan-expiry.mjs"
  }
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
```

- [ ] **Step 2: Write the failing schema and backfill tests**

Create `tests/schema-and-backfill.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { calculateBackfillExpiry } from '../scripts/backfill-plan-expiry.mjs';

describe('security hardening schema', () => {
  const schema = readFileSync('prisma/schema.prisma', 'utf8');
  const migration = readFileSync(
    'prisma/migrations/20260809000000_security_hardening/migration.sql',
    'utf8',
  );

  it('adds only the required nullable/defaulted fields and indexes', () => {
    expect(schema).toContain('planExpiresAt DateTime?');
    expect(schema).toContain('attempts  Int     @default(0)');
    expect(schema).toContain('requestIp String?');
    expect(schema).toContain('providerTradeNo String? @unique');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "planExpiresAt"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "attempts"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "requestIp"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "providerTradeNo"');
  });

  it('never deletes or truncates existing data', () => {
    expect(migration).not.toMatch(/\b(DROP|DELETE|TRUNCATE)\b/i);
    expect(schema).toContain('inputText  String');
    expect(schema).toContain('outputText String?');
  });

  it('gives legacy paid users a full 30-day grace period', () => {
    const deploymentAt = new Date('2026-08-09T00:00:00.000Z');
    expect(calculateBackfillExpiry(deploymentAt).toISOString())
      .toBe('2026-09-08T00:00:00.000Z');
  });
});
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```powershell
npm.cmd test -- tests/schema-and-backfill.test.ts
```

Expected: FAIL because the migration, schema fields, and backfill module do not exist.

- [ ] **Step 4: Add the schema and additive migration**

Add to `prisma/schema.prisma`:

```prisma
model User {
  // existing fields stay unchanged
  planExpiresAt DateTime?
}

model SmsCode {
  // existing fields stay unchanged
  attempts  Int     @default(0)
  requestIp String?

  @@index([requestIp, createdAt])
}

model Order {
  // existing fields stay unchanged
  providerTradeNo String? @unique
}
```

Create `prisma/migrations/20260809000000_security_hardening/migration.sql`:

```sql
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3);

ALTER TABLE "SmsCode"
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "requestIp" TEXT;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "providerTradeNo" TEXT;

CREATE INDEX IF NOT EXISTS "SmsCode_requestIp_createdAt_idx"
  ON "SmsCode"("requestIp", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Order_providerTradeNo_key"
  ON "Order"("providerTradeNo");
```

- [ ] **Step 5: Add the default-dry-run backfill script**

Create `scripts/backfill-plan-expiry.mjs`:

```js
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
  if (!value) throw new Error('Set PLAN_EXPIRY_BACKFILL_AT to the fixed deployment ISO timestamp');
  const { PrismaClient } = await import('@prisma/client');
  const client = new PrismaClient();
  try {
    const result = await runBackfill({
      apply: process.argv.includes('--apply'),
      deploymentAt: new Date(value),
      client,
    });
    console.log(JSON.stringify(result, null, 2));
    if (!process.argv.includes('--apply')) console.log('Dry run only; pass --apply to write.');
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
```

- [ ] **Step 6: Generate Prisma Client and verify GREEN**

Run:

```powershell
npx.cmd prisma generate
npm.cmd test -- tests/schema-and-backfill.test.ts
npm.cmd run typecheck
```

Expected: all commands exit 0; the test reports 3 passing tests.

- [ ] **Step 7: Commit the additive data foundation**

```powershell
git add package.json package-lock.json vitest.config.ts tests/schema-and-backfill.test.ts prisma/schema.prisma prisma/migrations/20260809000000_security_hardening/migration.sql scripts/backfill-plan-expiry.mjs
git commit -m "feat: add security hardening data foundation"
```

---

### Task 2: Server-Owned 30-Day Plan Entitlements

**Files:**
- Create: `tests/plan-entitlements.test.ts`
- Create: `tests/helpers/plan-client.ts`
- Create: `api/_lib/plan-entitlements.ts`
- Modify: `api/user/index.ts`
- Modify: `api/rewrite/submit.ts`
- Modify: `api/admin/index.ts`

**Interfaces:**
- Produces: `calculateExtendedExpiry(now: Date, currentExpiry: Date | null): Date`.
- Produces: `enforcePlanExpiry(userId: string, now?: Date, client?: PlanClient): Promise<User>`.
- Produces: `expireAllDuePlans(now?: Date, client?: PlanClient): Promise<number>`.
- Consumes later: payment settlement calls `calculateExtendedExpiry`; authentication routes call `enforcePlanExpiry`.

- [ ] **Step 1: Write failing entitlement tests**

Create `tests/plan-entitlements.test.ts` with an in-memory client that implements `user.updateMany` and `user.findUnique`, then assert these cases:

```ts
import { describe, expect, it } from 'vitest';
import {
  calculateExtendedExpiry,
  enforcePlanExpiry,
} from '../api/_lib/plan-entitlements';
import { createPlanClient } from './helpers/plan-client';

describe('calculateExtendedExpiry', () => {
  const now = new Date('2026-08-09T00:00:00.000Z');

  it('starts at payment time without a current expiry', () => {
    expect(calculateExtendedExpiry(now, null).toISOString())
      .toBe('2026-09-08T00:00:00.000Z');
  });

  it('adds 30 days after the remaining active period', () => {
    const current = new Date('2026-08-20T00:00:00.000Z');
    expect(calculateExtendedExpiry(now, current).toISOString())
      .toBe('2026-09-19T00:00:00.000Z');
  });

  it('restarts from payment time after expiry', () => {
    const expired = new Date('2026-08-01T00:00:00.000Z');
    expect(calculateExtendedExpiry(now, expired).toISOString())
      .toBe('2026-09-08T00:00:00.000Z');
  });
});

it('atomically clears quota and restores free plan only when due', async () => {
  const client = createPlanClient({
    id: 'u1', plan: 'pro', quota: 17,
    planExpiresAt: new Date('2026-08-08T23:59:59.000Z'),
  });
  const user = await enforcePlanExpiry(
    'u1',
    new Date('2026-08-09T00:00:00.000Z'),
    client,
  );
  expect(user).toMatchObject({ plan: 'free', quota: 0, planExpiresAt: null });
  expect(client.transitionCount).toBe(1);
});

it('two concurrent checks produce one transition', async () => {
  const client = createPlanClient({
    id: 'u1', plan: 'basic', quota: 50,
    planExpiresAt: new Date('2026-08-01T00:00:00.000Z'),
  });
  await Promise.all([
    enforcePlanExpiry('u1', new Date('2026-08-09T00:00:00.000Z'), client),
    enforcePlanExpiry('u1', new Date('2026-08-09T00:00:00.000Z'), client),
  ]);
  expect(client.transitionCount).toBe(1);
});
```

Create `tests/helpers/plan-client.ts`:

```ts
import type { PlanClient } from '../../api/_lib/plan-entitlements';

interface FakePlanUser {
  id: string;
  plan: string;
  quota: number;
  planExpiresAt: Date | null;
}

export function createPlanClient(initial: FakePlanUser) {
  let user = { ...initial };
  let transitionCount = 0;

  const client = {
    user: {
      async updateMany(args: any) {
        const due = user.id === args.where.id
          && user.plan !== 'free'
          && user.planExpiresAt !== null
          && user.planExpiresAt <= args.where.planExpiresAt.lte;
        if (!due) return { count: 0 };
        user = { ...user, ...args.data };
        transitionCount += 1;
        return { count: 1 };
      },
      async findUnique(args: any) {
        return args.where.id === user.id ? { ...user } as any : null;
      },
    },
    get transitionCount() {
      return transitionCount;
    },
    get currentUser() {
      return { ...user };
    },
  };

  return client as typeof client & PlanClient;
}
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
npm.cmd test -- tests/plan-entitlements.test.ts
```

Expected: FAIL because `api/_lib/plan-entitlements.ts` does not exist.

- [ ] **Step 3: Implement the entitlement module**

Create `api/_lib/plan-entitlements.ts`:

```ts
import type { Prisma, User } from '@prisma/client';
import prisma from './prisma.js';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface PlanClient {
  user: {
    updateMany(args: Prisma.UserUpdateManyArgs): Promise<{ count: number }>;
    findUnique(args: Prisma.UserFindUniqueArgs): Promise<User | null>;
  };
}

export function calculateExtendedExpiry(now: Date, currentExpiry: Date | null): Date {
  const base = currentExpiry && currentExpiry.getTime() > now.getTime()
    ? currentExpiry
    : now;
  return new Date(base.getTime() + THIRTY_DAYS_MS);
}

export async function enforcePlanExpiry(
  userId: string,
  now = new Date(),
  client: PlanClient = prisma,
): Promise<User> {
  await client.user.updateMany({
    where: {
      id: userId,
      plan: { not: 'free' },
      planExpiresAt: { not: null, lte: now },
    },
    data: { plan: 'free', quota: 0, planExpiresAt: null },
  });
  const user = await client.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');
  return user;
}

export async function expireAllDuePlans(
  now = new Date(),
  client: Pick<PlanClient, 'user'> = prisma,
): Promise<number> {
  const result = await client.user.updateMany({
    where: {
      plan: { not: 'free' },
      planExpiresAt: { not: null, lte: now },
    },
    data: { plan: 'free', quota: 0, planExpiresAt: null },
  });
  return result.count;
}
```

- [ ] **Step 4: Integrate lazy enforcement at authoritative access points**

In `api/user/index.ts`, immediately after authentication, call `enforcePlanExpiry(userId)` and use the returned user for `action=quota`. Return:

```ts
{
  quota: user.quota,
  totalUsed: user.totalUsed,
  plan: user.plan,
  planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
}
```

In `api/rewrite/submit.ts`, replace the initial `findUnique` with:

```ts
const user = await enforcePlanExpiry(userId);
```

In the admin users GET path, call `await expireAllDuePlans()` before `findMany`, and include `planExpiresAt: true` in the selected user fields.

For admin user PUT:

```ts
if (typeof plan === 'string') {
  data.plan = plan;
  if (plan === 'free') {
    data.planExpiresAt = null;
  } else {
    const current = await prisma.user.findUnique({ where: { id: targetId } });
    if (!current) return res.status(404).json({ error: '用户不存在' });
    if (!current.planExpiresAt || current.planExpiresAt <= new Date()) {
      data.planExpiresAt = calculateExtendedExpiry(new Date(), null);
    }
  }
}
```

Do not clear quota in an administrator’s manual edit unless that edit itself supplies `quota`; automatic expiry remains the only unconditional clear path.

- [ ] **Step 5: Verify GREEN and type consistency**

```powershell
npm.cmd test -- tests/plan-entitlements.test.ts
npm.cmd run typecheck
```

Expected: entitlement tests pass and TypeScript exits 0.

- [ ] **Step 6: Commit server-owned entitlements**

```powershell
git add tests/plan-entitlements.test.ts tests/helpers/plan-client.ts api/_lib/plan-entitlements.ts api/user/index.ts api/rewrite/submit.ts api/admin/index.ts
git commit -m "feat: enforce 30-day plan entitlements"
```

---

### Task 3: HttpOnly Cookie Session with Bearer Migration Compatibility

**Files:**
- Create: `tests/auth-session.test.ts`
- Modify: `api/_lib/auth.ts`
- Create: `api/_lib/user-view.ts`
- Create: `api/auth/logout.ts`
- Modify: `api/auth/sms.ts`
- Modify: `api/auth/phone-login.ts`
- Modify: `api/auth/set-password.ts`

**Interfaces:**
- Produces: `SESSION_COOKIE_NAME`, `createSessionCookie(token)`, `createExpiredSessionCookie()`, `setSessionCookie(res, token)`, `clearSessionCookie(res)`.
- Changes: `getUserFromRequest(req)` reads Cookie first and legacy Bearer second.
- Authentication responses return `{ user, needsPassword? }`; they no longer return a new frontend token.
- Produces: `toPublicUser(user)` returns only identity, role, plan, quota, usage, password presence, and `planExpiresAt`.

- [ ] **Step 1: Write failing session tests**

Create `tests/auth-session.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createExpiredSessionCookie,
  createSessionCookie,
  getUserFromRequest,
  signToken,
} from '../api/_lib/auth';

afterEach(() => vi.unstubAllEnvs());

describe('session cookies', () => {
  it('uses the HttpOnly cookie before a bearer token', () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    const cookieToken = signToken('cookie-user');
    const bearerToken = signToken('bearer-user');
    const userId = getUserFromRequest({ headers: {
      cookie: `paperfix_session=${encodeURIComponent(cookieToken)}`,
      authorization: `Bearer ${bearerToken}`,
    } });
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
    const userId = getUserFromRequest({ headers: {
      cookie: 'paperfix_session=stale',
      authorization: `Bearer ${signToken('legacy-user')}`,
    } });
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

  it('does not reveal whether a phone account exists', () => {
    const source = readFileSync('api/auth/phone-login.ts', 'utf8');
    expect(source).not.toContain('手机号未注册');
    expect(source).not.toContain('该账号尚未设置密码');
    expect(source).toContain('手机号或密码错误');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
npm.cmd test -- tests/auth-session.test.ts
```

Expected: FAIL because the Cookie helpers do not exist and Cookie authentication is unsupported.

- [ ] **Step 3: Implement Cookie parsing and serialization**

Update `api/_lib/auth.ts` with these exact public contracts:

```ts
export const SESSION_COOKIE_NAME = 'paperfix_session';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function readHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) return decodeURIComponent(rawValue.join('='));
  }
  return null;
}

export function createSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function createExpiredSessionCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function setSessionCookie(res: { setHeader(name: string, value: string): void }, token: string) {
  res.setHeader('Set-Cookie', createSessionCookie(token));
}

export function clearSessionCookie(res: { setHeader(name: string, value: string): void }) {
  res.setHeader('Set-Cookie', createExpiredSessionCookie());
}

export function getUserFromRequest(req: {
  headers: { cookie?: string | string[]; authorization?: string | string[] };
}): string | null {
  const cookieToken = readCookie(readHeader(req.headers.cookie), SESSION_COOKIE_NAME);
  const authorization = readHeader(req.headers.authorization);
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;
  const cookieUser = cookieToken ? verifyToken(cookieToken) : null;
  if (cookieUser) return cookieUser.userId;
  const bearerUser = bearerToken ? verifyToken(bearerToken) : null;
  return bearerUser?.userId ?? null;
}
```

- [ ] **Step 4: Set the Cookie on both active login flows**

Create `api/_lib/user-view.ts`:

```ts
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
```

In `api/auth/sms.ts` and `api/auth/phone-login.ts`:

```ts
const currentUser = await enforcePlanExpiry(user.id);
const token = signToken(currentUser.id);
setSessionCookie(res, token);
return res.status(200).json({
  user: toPublicUser(currentUser),
  needsPassword: !currentUser.passwordHash,
});
```

Import the shared `toPublicUser` helper. The returned object includes `planExpiresAt` and never includes `passwordHash` or `token`.

In `api/auth/phone-login.ts`, return the same `手机号或密码错误` response for an unknown phone, an account without a password, or a wrong password. Do not reveal account registration or password-setup state before authentication succeeds.

Create `api/auth/logout.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearSessionCookie } from '../_lib/auth.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  clearSessionCookie(res);
  return res.status(200).json({ success: true });
}
```

`api/auth/set-password.ts` continues to call `getUserFromRequest`; it therefore works with the Cookie immediately after first SMS verification.

- [ ] **Step 5: Verify GREEN**

```powershell
npm.cmd test -- tests/auth-session.test.ts
npm.cmd run typecheck
```

Expected: session tests pass; both login handlers compile without returning a token.

- [ ] **Step 6: Commit Cookie authentication**

```powershell
git add tests/auth-session.test.ts api/_lib/auth.ts api/auth/logout.ts api/auth/sms.ts api/auth/phone-login.ts api/auth/set-password.ts api/_lib/user-view.ts
git commit -m "feat: move browser sessions to http-only cookies"
```

---

### Task 4: Remove JWT and Text from Frontend Persistence

**Files:**
- Create: `tests/auth-store.test.ts`
- Modify: `src/store/useAuthStore.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/LoginModal.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/components/JobPoller.tsx`
- Modify: `src/pages/ReducePage.tsx`
- Modify: `src/pages/PricingPage.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/AdminPage.tsx`

**Interfaces:**
- `login(user: User): void`; no token parameter.
- `clearSession(): void`; local state only.
- `logout(): Promise<void>`; POSTs `/api/auth/logout`, then clears local state.
- `updateUserEntitlements(value: Pick<User, 'quota' | 'totalUsed' | 'plan' | 'planExpiresAt'>): void` merges server-authoritative plan state.
- `request<T>(path: string, options?: RequestInit): Promise<T>` always uses `credentials: 'same-origin'`.
- API helper functions no longer accept a token argument.

- [ ] **Step 1: Write a failing persistence whitelist test**

Export `selectPersistedAuthState` from the store and create `tests/auth-store.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { selectPersistedAuthState } from '../src/store/useAuthStore';

it('persists identity and a processing job without credentials or text', () => {
  const persisted = selectPersistedAuthState({
    user: { id: 'u1', role: 'user', plan: 'basic', quota: 4, totalUsed: 1 },
    isLoggedIn: true,
    activeJob: { jobId: 'j1', phase: 'done', result: 'rewritten text' },
    inputText: 'private original text',
  });
  expect(persisted).toEqual({ user: expect.any(Object), isLoggedIn: true, activeJob: null });
  expect(JSON.stringify(persisted)).not.toContain('private original text');
  expect(JSON.stringify(persisted)).not.toContain('rewritten text');
  expect(persisted).not.toHaveProperty('token');
  expect(persisted).not.toHaveProperty('planActivatedAt');
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
npm.cmd test -- tests/auth-store.test.ts
```

Expected: FAIL because `selectPersistedAuthState` does not exist and the current store persists token/text/result.

- [ ] **Step 3: Replace the store contract and persistence whitelist**

In `src/store/useAuthStore.ts`:

```ts
export interface User {
  id: string;
  email?: string;
  phone?: string;
  wechatName?: string;
  role: string;
  plan: string;
  quota: number;
  totalUsed: number;
  hasPassword?: boolean;
  planExpiresAt?: string | null;
}

type PersistableAuthState = Pick<AuthState, 'user' | 'isLoggedIn'> & {
  activeJob: ActiveJob | null;
};

export function selectPersistedAuthState(
  state: Pick<AuthState, 'user' | 'isLoggedIn' | 'activeJob' | 'inputText'>,
): PersistableAuthState {
  return {
    user: state.user,
    isLoggedIn: state.isLoggedIn,
    activeJob: state.activeJob?.phase === 'processing'
      ? { jobId: state.activeJob.jobId, phase: 'processing' }
      : null,
  };
}
```

Remove `token`, `planActivatedAt`, and `checkPlanExpiry` from `AuthState`. Keep `inputText` only in Zustand memory. Change the persist key to `paperfix-auth-storage-v2`, use `partialize: selectPersistedAuthState`, and remove the old key once at module initialization when `window` exists:

```ts
if (typeof window !== 'undefined') localStorage.removeItem('aigc-auth-storage');
```

Implement:

```ts
login: (user) => set({ user, isLoggedIn: true, showLoginModal: false }),
updateUserEntitlements: (value) => set((state) => ({
  user: state.user ? { ...state.user, ...value } : null,
})),
clearSession: () => set({ user: null, isLoggedIn: false, activeJob: null }),
logout: async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } finally {
    set({ user: null, isLoggedIn: false, activeJob: null });
  }
},
```

- [ ] **Step 4: Make the API client Cookie-only**

In `src/lib/api.ts`, delete the token parameter and Authorization header. The request must be:

```ts
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'same-origin',
  });
  if (res.status === 401) {
    const { useAuthStore } = await import('../store/useAuthStore');
    const store = useAuthStore.getState();
    store.clearSession();
    store.openLoginModal();
    throw new Error('登录已过期，请重新登录');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: '网络错误' }));
    throw new Error(data.error || `请求失败 (${res.status})`);
  }
  return res.json();
}
```

Update login response types to `{ user: User; needsPassword?: boolean }`. Update `QuotaResponse` to include `plan` and `planExpiresAt`.

- [ ] **Step 5: Update every frontend caller**

Apply these exact behavioral changes:

- `src/App.tsx`: remove `checkPlanExpiry` and its effect; retain only `initAnalytics()`.
- `src/components/LoginModal.tsx`: remove `tempToken`; call `login(data.user)`; first-login password setup calls `setUserPassword(newPwd)` through the Cookie.
- `src/components/Navbar.tsx`: call `fetchQuota()` whenever `isLoggedIn`; merge `quota`, `totalUsed`, `plan`, and `planExpiresAt`; both logout buttons call the async store `logout`.
- `src/components/JobPoller.tsx`: call `pollJobStatus(jobId)` and remove token from effect dependencies.
- `src/pages/ReducePage.tsx`: call `submitRewriteJob(text.trim())`; `fetchPlanMaxChars` no longer accepts token; input remains in memory through `saveInputText` but is not persisted.
- `src/pages/PricingPage.tsx`: call `createPaymentOrder(planKey, payType)`, `pollPaymentStatus(orderId)`, and `fetchQuota()`; polling depends on `isLoggedIn`, not token.
- `src/pages/DashboardPage.tsx`: call `fetchQuota()`, `fetchJobs()`, `fetchTopups()`, and `changePassword(...)` without token.
- `src/pages/AdminPage.tsx`: make `apiFetch(path, options)` call `request(path, options)` and remove all token references.

Use this server entitlement merge everywhere quota is refreshed:

```ts
updateUserEntitlements({
  quota: data.quota,
  totalUsed: data.totalUsed,
  plan: data.plan,
  planExpiresAt: data.planExpiresAt,
});
```

- [ ] **Step 6: Verify the persistence and source constraints**

```powershell
npm.cmd test -- tests/auth-store.test.ts
npm.cmd run typecheck
rg -n "\btoken\b|planActivatedAt" src
rg -n "inputText: state.inputText|result: state.activeJob" src/store/useAuthStore.ts
```

Expected: tests/typecheck pass; both `rg` commands return no matches.

- [ ] **Step 7: Commit the frontend session migration**

```powershell
git add tests/auth-store.test.ts src/store/useAuthStore.ts src/lib/api.ts src/App.tsx src/components/LoginModal.tsx src/components/Navbar.tsx src/components/JobPoller.tsx src/pages/ReducePage.tsx src/pages/PricingPage.tsx src/pages/DashboardPage.tsx src/pages/AdminPage.tsx
git commit -m "refactor: remove browser token and text persistence"
```

---

### Task 5: SMS Code Hashing, Attempt Limits, and IP Limits

**Files:**
- Create: `tests/sms-security.test.ts`
- Create: `api/_lib/sms-code.ts`
- Modify: `api/_lib/sms.ts`
- Modify: `api/auth/sms.ts`

**Interfaces:**
- Produces: `generateSmsCode(): string`, `hashSmsCode(phone, code): string`, `matchesSmsCode(phone, code, digest): boolean`.
- Produces: `MAX_SMS_VERIFY_ATTEMPTS = 5` and `getSmsRateLimitViolation(counts): string | null`.
- Produces: `sendSms(phone, code): Promise<{ mode: 'provider' | 'development' }>`; production missing provider credentials throws before logging or returning the code.
- SMS verification consumes one row via `updateMany` and permits at most 5 failed attempts.

- [ ] **Step 1: Write failing SMS primitive tests**

Create `tests/sms-security.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateSmsCode,
  getSmsRateLimitViolation,
  hashSmsCode,
  matchesSmsCode,
  MAX_SMS_VERIFY_ATTEMPTS,
} from '../api/_lib/sms-code';
import { sendSms } from '../api/_lib/sms';

afterEach(() => vi.unstubAllEnvs());

describe('SMS codes', () => {
  it('always generates exactly six numeric characters', () => {
    for (let i = 0; i < 200; i += 1) expect(generateSmsCode()).toMatch(/^\d{6}$/);
  });

  it('stores an HMAC digest, not the plaintext code', () => {
    vi.stubEnv('SMS_CODE_SECRET', 'test-sms-secret');
    const digest = hashSmsCode('13800138000', '012345');
    expect(digest).not.toContain('012345');
    expect(matchesSmsCode('13800138000', '012345', digest)).toBe(true);
    expect(matchesSmsCode('13800138000', '999999', digest)).toBe(false);
  });

  it('fails closed in production without provider credentials', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALIYUN_ACCESS_KEY_ID', '');
    vi.stubEnv('ALIYUN_ACCESS_KEY_SECRET', '');
    await expect(sendSms('13800138000', '012345')).rejects.toThrow('SMS provider is not configured');
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
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
npm.cmd test -- tests/sms-security.test.ts
```

Expected: FAIL because the secure primitive module does not exist and production currently returns success.

- [ ] **Step 3: Implement secure code primitives**

Create `api/_lib/sms-code.ts`:

```ts
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
  const expected = Buffer.from(hashSmsCode(phone, code), 'hex');
  const actual = Buffer.from(digest, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
```

- [ ] **Step 4: Make SMS delivery fail closed in production**

Replace `api/_lib/sms.ts` with:

```ts
import { createHmac, randomUUID } from 'node:crypto';

export type SmsDelivery = { mode: 'provider' | 'development' };

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

export async function sendSms(phone: string, code: string): Promise<SmsDelivery> {
  const accessKeyId = (process.env.ALIYUN_ACCESS_KEY_ID || '').trim();
  const accessKeySecret = (process.env.ALIYUN_ACCESS_KEY_SECRET || '').trim();

  if (!accessKeyId || !accessKeySecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMS provider is not configured');
    }
    console.info('[SMS] development delivery bypass enabled');
    return { mode: 'development' };
  }

  const params: Record<string, string> = {
    AccessKeyId: accessKeyId,
    Action: 'SendSmsVerifyCode',
    CodeLength: '6',
    CodeType: '1',
    Format: 'JSON',
    Interval: '60',
    PhoneNumber: phone,
    RegionId: 'cn-hangzhou',
    SignName: process.env.SMS_SIGN_NAME || '速通互联验证码',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: randomUUID(),
    SignatureVersion: '1.0',
    TemplateCode: process.env.SMS_TEMPLATE_CODE || '100001',
    TemplateParam: JSON.stringify({ code, min: '5' }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    ValidTime: '300',
    Version: '2017-05-25',
  };
  const canonicalQuery = Object.keys(params).sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');
  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonicalQuery)}`;
  const signature = createHmac('sha1', `${accessKeySecret}&`)
    .update(stringToSign)
    .digest('base64');
  const url = `https://dypnsapi.aliyuncs.com/?${canonicalQuery}&Signature=${percentEncode(signature)}`;

  try {
    const response = await fetch(url);
    const data = await response.json() as { Code?: string; Success?: boolean };
    if (data.Code === 'OK' && data.Success === true) return { mode: 'provider' };
    console.error('[SMS] provider rejected request', { code: data.Code });
    throw new Error('SMS provider rejected the request');
  } catch (error) {
    console.error('[SMS] provider request failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    throw new Error('SMS provider rejected the request');
  }
}
```

- [ ] **Step 5: Replace the SMS handler’s duplicate sender and plaintext flow**

In `api/auth/sms.ts`:

1. Delete the local `generateCode`, `percentEncode`, and `sendSms` implementations.
2. Import `generateSmsCode`, `hashSmsCode`, `matchesSmsCode`, shared `sendSms`, and `getClientIp`.
3. For send, query phone limits (60 seconds and 10/day) plus IP limits (20/hour and 100/day), pass the four counts to `getSmsRateLimitViolation`, and return 429 before delivery when it returns a message.
4. Invalidate previous unused codes for the phone, then create:

```ts
await prisma.smsCode.create({
  data: {
    phone,
    code: hashSmsCode(phone, newCode),
    requestIp,
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
  },
});
```

5. Call the shared sender and return `devCode` only when `delivery.mode === 'development'` and `NODE_ENV !== 'production'`.
6. For verification, select only `used=false`, `expiresAt > now`, `attempts < MAX_SMS_VERIFY_ATTEMPTS`. On mismatch, atomically increment attempts with `updateMany({ where: { id, used: false, attempts: currentAttempts }, data: { attempts: { increment: 1 } } })`.
7. On match, consume with:

```ts
const consumed = await prisma.smsCode.updateMany({
  where: { id: smsCode.id, used: false, attempts: { lt: 5 }, expiresAt: { gt: now } },
  data: { used: true },
});
if (consumed.count !== 1) return res.status(400).json({ error: '验证码错误或已过期' });
```

Every verification failure uses the same public message `验证码错误或已过期`.

- [ ] **Step 6: Verify GREEN and source constraints**

```powershell
npm.cmd test -- tests/sms-security.test.ts
npm.cmd run typecheck
rg -n "Math\.random|SMS-DEV.*code|code: newCode" api/auth api/_lib
```

Expected: tests/typecheck pass; the source scan returns no plaintext storage or code logging.

- [ ] **Step 7: Commit SMS hardening**

```powershell
git add tests/sms-security.test.ts api/_lib/sms-code.ts api/_lib/sms.ts api/auth/sms.ts
git commit -m "fix: harden sms verification and rate limits"
```

---

### Task 6: Same-Origin Mutation Checks and Security Headers

**Files:**
- Create: `tests/http-security.test.ts`
- Create: `api/_lib/http-security.ts`
- Modify: `api/auth/sms.ts`
- Modify: `api/auth/phone-login.ts`
- Modify: `api/auth/set-password.ts`
- Modify: `api/auth/logout.ts`
- Modify: `api/user/index.ts`
- Modify: `api/admin/index.ts`
- Modify: `api/payment/create.ts`
- Modify: `api/rewrite/submit.ts`
- Modify: `vercel.json`
- Modify: `index.html`

**Interfaces:**
- Produces: `getClientIp(req): string` and `isAllowedBrowserOrigin(req): boolean`.
- Produces: `rejectCrossOriginMutation(req, res): boolean`; returns `true` after sending 403.
- Payment provider callback `/api/payment/notify` remains signature-authenticated and is explicitly exempt.

- [ ] **Step 1: Write failing HTTP security tests**

Create `tests/http-security.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getClientIp, isAllowedBrowserOrigin } from '../api/_lib/http-security';

describe('same-origin protection', () => {
  it('accepts the request host and rejects an unrelated origin', () => {
    const base = { headers: { host: 'www.paperfixes.com', 'x-forwarded-proto': 'https' } };
    expect(isAllowedBrowserOrigin({ headers: { ...base.headers, origin: 'https://www.paperfixes.com' } })).toBe(true);
    expect(isAllowedBrowserOrigin({ headers: { ...base.headers, origin: 'https://evil.example' } })).toBe(false);
  });

  it('uses the first forwarded client IP', () => {
    expect(getClientIp({ headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } })).toBe('203.0.113.7');
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
  expect(html).not.toContain('push.zhanzhang.baidu.com');
});

it('guards browser mutation routes but exempts the signed payment callback', () => {
  const guarded = [
    'api/auth/sms.ts', 'api/auth/phone-login.ts', 'api/auth/set-password.ts',
    'api/auth/logout.ts', 'api/user/index.ts', 'api/admin/index.ts',
    'api/payment/create.ts', 'api/rewrite/submit.ts',
  ];
  for (const file of guarded) {
    expect(readFileSync(file, 'utf8')).toContain('rejectCrossOriginMutation');
  }
  expect(readFileSync('api/payment/notify.ts', 'utf8'))
    .not.toContain('rejectCrossOriginMutation');
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
npm.cmd test -- tests/http-security.test.ts
```

Expected: FAIL because the helper and headers do not exist and wildcard CORS/Baidu push remain.

- [ ] **Step 3: Implement origin and IP helpers**

Create `api/_lib/http-security.ts` with header normalization, first-IP parsing, and these rules:

```ts
import type { VercelResponse } from '@vercel/node';

type HeaderValue = string | string[] | undefined;
export interface RequestWithHeaders {
  headers: Record<string, HeaderValue>;
}

function first(value: HeaderValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getClientIp(req: RequestWithHeaders): string {
  const forwarded = first(req.headers['x-forwarded-for']);
  const direct = first(req.headers['x-real-ip']);
  return (forwarded?.split(',')[0] || direct || 'unknown').trim().slice(0, 64);
}

export function isAllowedBrowserOrigin(req: RequestWithHeaders): boolean {
  const origin = first(req.headers.origin);
  if (!origin) return true;
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host);
  const protocol = first(req.headers['x-forwarded-proto']) || 'https';
  const allowed = new Set<string>();
  if (host) allowed.add(`${protocol}://${host}`);
  if (process.env.SITE_URL) {
    try { allowed.add(new URL(process.env.SITE_URL).origin); } catch { /* ignore invalid config */ }
  }
  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:5173');
    allowed.add('http://127.0.0.1:5173');
  }
  try {
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function rejectCrossOriginMutation(req: RequestWithHeaders, res: VercelResponse): boolean {
  if (isAllowedBrowserOrigin(req)) return false;
  res.status(403).json({ error: '请求来源无效' });
  return true;
}
```

Malformed Origin values return `false`, not an exception.

- [ ] **Step 4: Guard every browser mutation route**

Immediately after the method check, add:

```ts
if (rejectCrossOriginMutation(req, res)) return;
```

Apply it to SMS send/verify, phone login, set password, logout, user password change, admin PUT/topup, payment create, and rewrite submit. Do not add it to `api/payment/notify.ts`.

- [ ] **Step 5: Replace Vercel CORS with exact security headers**

Replace `vercel.json` headers with a global block and an API no-store block. The CSP value must be:

```text
default-src 'self'; script-src 'self' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com; img-src 'self' data: https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self' https:; frame-ancestors 'none'; upgrade-insecure-requests
```

The global headers must also set:

```text
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
X-Frame-Options: DENY
```

The `/api/(.*)` block sets `Cache-Control: private, no-store`. Delete all `Access-Control-*` headers. Delete the Baidu push script from `index.html`.

- [ ] **Step 6: Verify GREEN and valid configuration**

```powershell
npm.cmd test -- tests/http-security.test.ts
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('valid vercel.json')"
npm.cmd run typecheck
```

Expected: HTTP security tests pass, JSON parser prints `valid vercel.json`, typecheck exits 0.

- [ ] **Step 7: Commit HTTP hardening**

```powershell
git add tests/http-security.test.ts api/_lib/http-security.ts api/auth api/user/index.ts api/admin/index.ts api/payment/create.ts api/rewrite/submit.ts vercel.json index.html
git commit -m "fix: enforce same-origin mutations and security headers"
```

---

### Task 7: Idempotent Single-Transaction Payment Settlement

**Files:**
- Create: `tests/order-settlement.test.ts`
- Create: `tests/helpers/settlement-client.ts`
- Create: `api/_lib/order-settlement.ts`
- Modify: `api/payment/notify.ts`
- Modify: `api/payment/status.ts`

**Interfaces:**
- Consumes: `calculateExtendedExpiry(now, currentExpiry)` from Task 2.
- Produces: `amountToCents(value: string | number): number`.
- Produces: `finalizePaidOrder(input, client?): Promise<'credited' | 'already_paid'>`.

- [ ] **Step 1: Write failing settlement tests with a transactional in-memory client**

Create `tests/helpers/settlement-client.ts`:

```ts
export interface SettlementFixture {
  order: {
    id: string; userId: string; status: string; amount: number;
    quota: number; planKey: string; providerTradeNo?: string | null;
  };
  user: {
    id: string; plan: string; quota: number;
    planExpiresAt: Date | null;
  };
}

export function createSettlementClient(
  fixture: SettlementFixture,
  options: { failTopup?: boolean } = {},
) {
  let state = {
    order: { providerTradeNo: null, ...structuredClone(fixture.order) },
    user: structuredClone(fixture.user),
    topups: [] as Array<Record<string, unknown>>,
  };
  let queue: Promise<unknown> = Promise.resolve();

  const client = {
    get state() { return state; },
    $transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
      const execute = async () => {
        const snapshot = structuredClone(state);
        const tx = {
          order: {
            findUnique: async ({ where }: any) => {
              if (where.id) return where.id === state.order.id ? { ...state.order } : null;
              if (where.providerTradeNo) {
                return where.providerTradeNo === state.order.providerTradeNo
                  ? { ...state.order }
                  : null;
              }
              return null;
            },
            updateMany: async ({ where, data }: any) => {
              if (where.id !== state.order.id || where.status !== state.order.status) return { count: 0 };
              state.order = { ...state.order, ...data };
              return { count: 1 };
            },
          },
          user: {
            findUnique: async ({ where }: any) => where.id === state.user.id ? { ...state.user } : null,
            update: async ({ where, data }: any) => {
              if (where.id !== state.user.id) throw new Error('USER_NOT_FOUND');
              state.user = {
                ...state.user,
                plan: data.plan,
                planExpiresAt: data.planExpiresAt,
                quota: typeof data.quota === 'number'
                  ? data.quota
                  : state.user.quota + data.quota.increment,
              };
              return { ...state.user };
            },
          },
          topup: {
            create: async ({ data }: any) => {
              if (options.failTopup) throw new Error('TOPUP_WRITE_FAILED');
              state.topups.push({ ...data });
              return data;
            },
          },
        };
        try {
          return await callback(tx);
        } catch (error) {
          state = snapshot;
          throw error;
        }
      };
      const result = queue.then(execute, execute) as Promise<T>;
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
  };
  return client;
}
```

Create `tests/order-settlement.test.ts` using this fixture:

```ts
import { expect, it } from 'vitest';
import { finalizePaidOrder } from '../api/_lib/order-settlement';
import { createSettlementClient } from './helpers/settlement-client';

const paidAt = new Date('2026-08-09T00:00:00.000Z');
const pendingFixture = {
  order: {
    id: 'o1', userId: 'u1', status: 'PENDING', amount: 29,
    quota: 50, planKey: 'basic', providerTradeNo: null,
  },
  user: {
    id: 'u1', plan: 'free', quota: 3, planExpiresAt: null,
  },
};
const validInput = {
  orderId: 'o1', providerTradeNo: 'trade-1', paidAmount: '29.00', paidAt,
};

it('credits once and extends from the current remaining expiry', async () => {
  const client = createSettlementClient({
    order: { id: 'o1', userId: 'u1', status: 'PENDING', amount: 29, quota: 50, planKey: 'basic' },
    user: { id: 'u1', plan: 'pro', quota: 7, planExpiresAt: new Date('2026-08-20T00:00:00.000Z') },
  });
  const input = { ...validInput };
  expect(await finalizePaidOrder(input, client)).toBe('credited');
  expect(await finalizePaidOrder(input, client)).toBe('already_paid');
  expect(client.state.user).toMatchObject({ plan: 'basic', quota: 57 });
  expect(client.state.user.planExpiresAt.toISOString()).toBe('2026-09-19T00:00:00.000Z');
  expect(client.state.topups).toHaveLength(1);
});

it('rejects an amount mismatch without changing state', async () => {
  const client = createSettlementClient(pendingFixture);
  await expect(finalizePaidOrder({
    orderId: 'o1', providerTradeNo: 'trade-1', paidAmount: '0.01',
  }, client)).rejects.toThrow('PAYMENT_AMOUNT_MISMATCH');
  expect(client.state.order.status).toBe('PENDING');
  expect(client.state.user.quota).toBe(pendingFixture.user.quota);
  expect(client.state.topups).toHaveLength(0);
});

it('rolls back order and quota when topup creation fails', async () => {
  const client = createSettlementClient(pendingFixture, { failTopup: true });
  await expect(finalizePaidOrder(validInput, client)).rejects.toThrow('TOPUP_WRITE_FAILED');
  expect(client.state.order.status).toBe('PENDING');
  expect(client.state.user.quota).toBe(pendingFixture.user.quota);
});

it('two concurrent callbacks credit exactly once', async () => {
  const client = createSettlementClient(pendingFixture);
  const results = await Promise.all([
    finalizePaidOrder(validInput, client),
    finalizePaidOrder(validInput, client),
  ]);
  expect(results.sort()).toEqual(['already_paid', 'credited']);
  expect(client.state.topups).toHaveLength(1);
});

it('clears stale expired quota before applying a new purchase', async () => {
  const client = createSettlementClient({
    order: { id: 'o1', userId: 'u1', status: 'PENDING', amount: 29, quota: 50, planKey: 'basic' },
    user: { id: 'u1', plan: 'pro', quota: 19, planExpiresAt: new Date('2026-08-01T00:00:00.000Z') },
  });
  await finalizePaidOrder(validInput, client);
  expect(client.state.user.quota).toBe(50);
  expect(client.state.user.planExpiresAt.toISOString()).toBe('2026-09-08T00:00:00.000Z');
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
npm.cmd test -- tests/order-settlement.test.ts
```

Expected: FAIL because `finalizePaidOrder` does not exist.

- [ ] **Step 3: Implement amount validation and transaction settlement**

Create `api/_lib/order-settlement.ts` around this transaction boundary:

```ts
import type { Prisma } from '@prisma/client';
import prisma from './prisma.js';
import { calculateExtendedExpiry } from './plan-entitlements.js';

type SettlementTx = Pick<Prisma.TransactionClient, 'order' | 'user' | 'topup'>;

export interface SettlementClient {
  $transaction<T>(callback: (tx: SettlementTx) => Promise<T>): Promise<T>;
}

export interface SettlementInput {
  orderId: string;
  providerTradeNo: string;
  paidAmount: string | number;
  paidAt?: Date;
}

export function amountToCents(value: string | number): number {
  const amount = typeof value === 'number' ? value : Number(value.trim());
  if (!Number.isFinite(amount) || amount < 0) throw new Error('PAYMENT_AMOUNT_INVALID');
  return Math.round((amount + Number.EPSILON) * 100);
}

export async function finalizePaidOrder(
  input: SettlementInput,
  client: SettlementClient = prisma,
): Promise<'credited' | 'already_paid'> {
  if (!input.orderId || !input.providerTradeNo) throw new Error('PAYMENT_IDENTIFIERS_REQUIRED');
  const paidAt = input.paidAt ?? new Date();

  return client.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: input.orderId } });
    if (!order) throw new Error('ORDER_NOT_FOUND');
    if (amountToCents(order.amount) !== amountToCents(input.paidAmount)) {
      throw new Error('PAYMENT_AMOUNT_MISMATCH');
    }
    if (order.status === 'PAID') {
      if (order.providerTradeNo && order.providerTradeNo !== input.providerTradeNo) {
        throw new Error('PAYMENT_TRADE_MISMATCH');
      }
      return 'already_paid';
    }
    if (order.status !== 'PENDING') throw new Error('ORDER_NOT_PAYABLE');

    const duplicateTrade = await tx.order.findUnique({
      where: { providerTradeNo: input.providerTradeNo },
    });
    if (duplicateTrade && duplicateTrade.id !== order.id) throw new Error('PAYMENT_TRADE_REUSED');

    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: 'PENDING' },
      data: { status: 'PAID', providerTradeNo: input.providerTradeNo, paidAt },
    });
    if (claimed.count !== 1) {
      const settled = await tx.order.findUnique({ where: { id: order.id } });
      if (settled?.status === 'PAID' && settled.providerTradeNo === input.providerTradeNo) {
        return 'already_paid';
      }
      throw new Error('PAYMENT_SETTLEMENT_CONFLICT');
    }

    const user = await tx.user.findUnique({ where: { id: order.userId } });
    if (!user) throw new Error('USER_NOT_FOUND');
    const planExpiresAt = calculateExtendedExpiry(paidAt, user.planExpiresAt);
    const expiredPaidPlan = user.plan !== 'free'
      && user.planExpiresAt !== null
      && user.planExpiresAt <= paidAt;
    await tx.user.update({
      where: { id: user.id },
      data: {
        quota: expiredPaidPlan ? order.quota : { increment: order.quota },
        plan: order.planKey,
        planExpiresAt,
      },
    });
    await tx.topup.create({
      data: {
        userId: user.id,
        amount: order.quota,
        price: order.amount,
        planKey: order.planKey,
        note: `在线支付 ${input.providerTradeNo}`,
      },
    });
    return 'credited';
  });
}
```

`amountToCents` must reject non-finite or negative values and compare rounded integer cents.

- [ ] **Step 4: Route both payment confirmation paths through the service**

In `api/payment/notify.ts`:

- Keep signature verification first.
- Require `params.pid === process.env.EPAY_PID`.
- Require `trade_status === 'TRADE_SUCCESS'`, `trade_no`, `out_trade_no`, and `money`.
- Call `finalizePaidOrder({ orderId: out_trade_no, providerTradeNo: trade_no, paidAmount: money })`.
- Return `success` for both `credited` and `already_paid`; validation errors return 400 without changing state.

In `api/payment/status.ts`, only settle when the provider response proves all of:

```ts
queryData.code === 1
Number(queryData.status) === 1
queryData.pid === process.env.EPAY_PID
queryData.out_trade_no === orderId
typeof queryData.trade_no === 'string' && queryData.trade_no.length > 0
queryData.money !== undefined
```

Then call the same `finalizePaidOrder`. Delete every route-level `order.updateMany`, `user.update`, and `topup.create` payment-credit block.

- [ ] **Step 5: Verify GREEN and transaction ownership**

```powershell
npm.cmd test -- tests/order-settlement.test.ts
npm.cmd run typecheck
rg -n "quota: \{ increment: order\.quota \}|topup\.create" api/payment
```

Expected: tests/typecheck pass; the final scan only matches `api/_lib/order-settlement.ts`, not either route.

- [ ] **Step 6: Commit payment settlement**

```powershell
git add tests/order-settlement.test.ts tests/helpers/settlement-client.ts api/_lib/order-settlement.ts api/payment/notify.ts api/payment/status.ts
git commit -m "fix: settle payments in one idempotent transaction"
```

---

### Task 8: Exactly-Once Job Failure Refunds

**Files:**
- Create: `tests/job-refund.test.ts`
- Create: `tests/helpers/refund-client.ts`
- Create: `api/_lib/job-refund.ts`
- Modify: `api/rewrite/status/[jobId].ts`

**Interfaces:**
- Produces: `refundJobOnce(input, client?): Promise<boolean>`.
- Produces: `refundTimedOutJob(jobId, userId, now?, client?): Promise<boolean>`.
- `refundJobOnce` accepts only `PENDING`/`PROCESSING` and returns `true` only for the request that changed the job to `FAILED` and refunded quota.

- [ ] **Step 1: Write failing concurrent refund tests**

Create `tests/helpers/refund-client.ts`:

```ts
export interface RefundFixture {
  job: { id: string; userId: string; status: string; error?: string | null };
  user: { id: string; quota: number; totalUsed: number };
}

export function createRefundClient(fixture: RefundFixture) {
  let state = structuredClone(fixture);
  let queue: Promise<unknown> = Promise.resolve();
  const client = {
    get state() { return state; },
    $transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
      const execute = async () => {
        const snapshot = structuredClone(state);
        const tx = {
          job: {
            updateMany: async ({ where, data }: any) => {
              const matches = state.job.id === where.id
                && state.job.userId === where.userId
                && where.status.in.includes(state.job.status);
              if (!matches) return { count: 0 };
              state.job = { ...state.job, ...data };
              return { count: 1 };
            },
          },
          user: {
            updateMany: async ({ where, data }: any) => {
              if (state.user.id !== where.id || state.user.totalUsed <= 0) return { count: 0 };
              state.user = {
                ...state.user,
                quota: state.user.quota + data.quota.increment,
                totalUsed: state.user.totalUsed - 1,
              };
              return { count: 1 };
            },
          },
        };
        try {
          return await callback(tx);
        } catch (error) {
          state = snapshot;
          throw error;
        }
      };
      const result = queue.then(execute, execute) as Promise<T>;
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
  };
  return client;
}
```

Create `tests/job-refund.test.ts`:

```ts
import { expect, it } from 'vitest';
import { refundTimedOutJob } from '../api/_lib/job-refund';
import { createRefundClient } from './helpers/refund-client';

const now = new Date('2026-08-09T00:00:00.000Z');
const fixture = {
  job: { id: 'j1', userId: 'u1', status: 'PROCESSING' },
  user: { id: 'u1', quota: 2, totalUsed: 4 },
};

it('refunds one quota exactly once under concurrency', async () => {
  const client = createRefundClient({
    job: { id: 'j1', userId: 'u1', status: 'PROCESSING' },
    user: { id: 'u1', quota: 2, totalUsed: 4 },
  });
  const results = await Promise.all([
    refundTimedOutJob('j1', 'u1', now, client),
    refundTimedOutJob('j1', 'u1', now, client),
  ]);
  expect(results.sort()).toEqual([false, true]);
  expect(client.state.user).toMatchObject({ quota: 3, totalUsed: 3 });
  expect(client.state.job.status).toBe('FAILED');
});

it('does not refund another users job', async () => {
  const client = createRefundClient(fixture);
  expect(await refundTimedOutJob('j1', 'attacker', now, client)).toBe(false);
  expect(client.state.user.quota).toBe(fixture.user.quota);
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
npm.cmd test -- tests/job-refund.test.ts
```

Expected: FAIL because the refund module does not exist.

- [ ] **Step 3: Implement the transactional conditional refund**

Create `api/_lib/job-refund.ts`:

```ts
import type { Prisma } from '@prisma/client';
import prisma from './prisma.js';

type RefundTx = Pick<Prisma.TransactionClient, 'job' | 'user'>;

export interface RefundClient {
  $transaction<T>(callback: (tx: RefundTx) => Promise<T>): Promise<T>;
}

export async function refundJobOnce(
  input: { jobId: string; userId: string; error: string; now?: Date },
  client: RefundClient = prisma,
): Promise<boolean> {
  return client.$transaction(async (tx) => {
    const failed = await tx.job.updateMany({
      where: {
        id: input.jobId,
        userId: input.userId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      data: {
        status: 'FAILED',
        error: input.error,
        doneAt: input.now ?? new Date(),
      },
    });
    if (failed.count !== 1) return false;
    const refunded = await tx.user.updateMany({
      where: { id: input.userId, totalUsed: { gt: 0 } },
      data: { quota: { increment: 1 }, totalUsed: { decrement: 1 } },
    });
    if (refunded.count !== 1) throw new Error('REFUND_USER_STATE_INVALID');
    return true;
  });
}

export function refundTimedOutJob(
  jobId: string,
  userId: string,
  now = new Date(),
  client: RefundClient = prisma,
) {
  return refundJobOnce({ jobId, userId, error: '处理超时，额度已退还', now }, client);
}
```

- [ ] **Step 4: Use the helper for timeout and AI failure**

In `api/rewrite/status/[jobId].ts`:

- Replace the timeout transaction with `await refundTimedOutJob(job.id, userId)`.
- Replace the AI catch transaction with `await refundJobOnce({ jobId: job.id, userId, error: errorMessage })`.
- Claim `PENDING -> PROCESSING` with `updateMany` and require `count === 1`.
- Complete `PROCESSING -> DONE` with a conditional `updateMany`. If its count is 0, re-read the job and return the stored final state so a late AI response cannot overwrite a timeout refund.

The completion write must be:

```ts
const completed = await prisma.job.updateMany({
  where: { id: job.id, userId, status: 'PROCESSING' },
  data: {
    status: 'DONE',
    outputText: aiResult,
    outputLen: aiResult.length,
    doneAt: new Date(),
  },
});
```

After any helper or conditional completion returns `false`/count 0, re-read with `findFirst({ where: { id: job.id, userId } })` and return that stored status, result, error, lengths, and `doneAt`. Never synthesize a second refund response after another request has already finalized the task.

- [ ] **Step 5: Verify GREEN and remove direct refunds**

```powershell
npm.cmd test -- tests/job-refund.test.ts
npm.cmd run typecheck
rg -n "quota: \{ increment: 1 \}" api/rewrite
```

Expected: tests/typecheck pass; the scan only matches `api/_lib/job-refund.ts`.

- [ ] **Step 6: Commit exactly-once refunds**

```powershell
git add tests/job-refund.test.ts tests/helpers/refund-client.ts api/_lib/job-refund.ts api/rewrite/status/[jobId].ts
git commit -m "fix: make failed job refunds exactly once"
```

---

### Task 9: Truthful Retention Copy and Visible 30-Day Terms

**Files:**
- Create: `tests/copy-policy.test.ts`
- Modify: `src/pages/PrivacyPage.tsx`
- Modify: `src/pages/FaqPage.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: `src/data/articles.ts`
- Modify: `src/pages/PricingPage.tsx`
- Modify: `src/components/PaymentModal.tsx`
- Modify: `src/pages/DashboardPage.tsx`
- Modify: `src/pages/TermsPage.tsx`
- Modify: `api/admin/index.ts`

**Interfaces:**
- Public copy states database retention for account history.
- Paid plan copy states 30-day validity, remaining-term extension, and expiry reset.
- Admin plan normalization guarantees every active paid plan includes `30 天有效` and excludes any permanent-validity wording.

- [ ] **Step 1: Write failing copy policy tests**

Create `tests/copy-policy.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const publicFiles = [
  'src/pages/PrivacyPage.tsx',
  'src/pages/FaqPage.tsx',
  'src/pages/HomePage.tsx',
  'src/components/Footer.tsx',
  'src/data/articles.ts',
  'src/pages/PricingPage.tsx',
  'src/components/PaymentModal.tsx',
  'src/pages/TermsPage.tsx',
];
const copy = publicFiles.map((file) => readFileSync(file, 'utf8')).join('\n');

it('contains no false or absolute promises', () => {
  expect(copy).not.toMatch(/不留存(任何)?原文|处理完成后不留存/);
  expect(copy).not.toContain('技术术语零修改');
  expect(copy).not.toMatch(/±\s*5%/);
  expect(copy).not.toContain('额度永久有效');
});

it('states the actual retention and plan expiry behavior', () => {
  expect(copy).toContain('保存用户提交的原文、处理结果和任务记录');
  expect(copy).toContain('付费套餐有效期为 30 天');
  expect(copy).toContain('当前剩余有效期后叠加 30 天');
  expect(copy).toContain('到期后未使用额度清零并恢复免费套餐');
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
npm.cmd test -- tests/copy-policy.test.ts
```

Expected: FAIL on the existing no-retention, zero-modification, ±5%, and permanent-validity text.

- [ ] **Step 3: Replace privacy and product claims with exact truthful copy**

Use these exact statements:

- Privacy: `为提供改写服务和账号历史记录，PaperFix 会在账号存续期间保存用户提交的原文、处理结果和任务记录，以及登录、套餐、订单和必要技术记录。`
- Privacy warning: `请勿提交未公开科研数据、商业秘密、患者信息、个人敏感信息或其他你无权处理的内容。`
- Set the Privacy and Terms update date to `2026-08-09`.
- FAQ: `会。为便于用户查看最近 50 条历史记录，系统会保存提交的原文、处理结果和任务状态。`
- Home/Footer: `原文与结果保存在账号历史`、`技术术语尽量保持稳定`、`输出篇幅尽量接近原文`。
- Remove the privacy page’s promise to provide a deletion endpoint; the contact section only states how to contact the operator about account/data questions.
- In `src/data/articles.ts`, replace the two `不留存原文` claims with transparent history-retention guidance.

- [ ] **Step 4: Make 30-day purchase terms unavoidable before payment**

In `src/pages/PricingPage.tsx`, replace `按需购买，额度永久有效` with:

```tsx
<p className="mt-3 text-gray-500">所有付费套餐有效期为 30 天</p>
<p className="mt-2 text-sm text-gray-400">
  有效期内续购将在当前剩余有效期后叠加 30 天；到期后未使用额度清零并恢复免费套餐。
</p>
```

In `src/components/PaymentModal.tsx`, immediately below the quota line add:

```tsx
<p className="mt-1 text-xs text-amber-700">
  付费套餐有效期为 30 天；续购在当前剩余有效期后叠加 30 天，到期后未使用额度清零并恢复免费套餐。
</p>
```

In `src/pages/TermsPage.tsx` section 4, repeat the same expiry rule. In `src/pages/DashboardPage.tsx`, show `有效期至 {toLocaleString('zh-CN')}` for paid users with `planExpiresAt`.

- [ ] **Step 5: Normalize paid plan feature labels server-side**

Update `normalizePlans` in `api/admin/index.ts` so every non-free plan:

1. Removes features containing `永久有效`.
2. Removes duplicate variants matching `/30\s*天有效/`.
3. Appends exactly `30 天有效`.

Apply normalization on both config GET and admin PUT before storing. Do not change plan prices, quotas, min/max characters, active state, or sort order.

- [ ] **Step 6: Verify GREEN and scan the whole source tree**

```powershell
npm.cmd test -- tests/copy-policy.test.ts
npm.cmd run typecheck
rg -n "不留存(任何)?原文|技术术语零修改|±\s*5%|额度永久有效" src
```

Expected: test/typecheck pass; the final scan returns no matches.

- [ ] **Step 7: Commit truthful copy and terms**

```powershell
git add tests/copy-policy.test.ts src/pages/PrivacyPage.tsx src/pages/FaqPage.tsx src/pages/HomePage.tsx src/components/Footer.tsx src/data/articles.ts src/pages/PricingPage.tsx src/components/PaymentModal.tsx src/pages/DashboardPage.tsx src/pages/TermsPage.tsx api/admin/index.ts
git commit -m "fix: align retention and plan terms with product behavior"
```

---

### Task 10: Deployment Runbook and Full Completion Audit

**Files:**
- Create: `docs/deployment/security-hardening-rollout.md`
- Modify only if verification finds a defect: files owned by Tasks 1–9.

**Interfaces:**
- Produces an operator-safe sequence with dry-run, explicit apply, smoke tests, observation, and application rollback.

- [ ] **Step 1: Write the rollout runbook**

Create `docs/deployment/security-hardening-rollout.md` with these exact phases:

```markdown
# Security Hardening Rollout

## 1. Preflight
- Record the deployed Git SHA and Vercel deployment URL.
- Back up PostgreSQL.
- Record counts for User, Job, Order, and Topup.
- Confirm JWT_SECRET, SMS_CODE_SECRET, ALIYUN_ACCESS_KEY_ID,
  ALIYUN_ACCESS_KEY_SECRET, EPAY_PID, EPAY_KEY, EPAY_API, and SITE_URL.

## 2. Additive migration
Run `npx.cmd prisma migrate deploy`.
Inspect the migration first and confirm it contains no DROP, DELETE, or TRUNCATE.

## 3. Legacy plan dry-run and apply
Set PLAN_EXPIRY_BACKFILL_AT once to the fixed UTC deployment timestamp.
Run `npm.cmd run db:backfill-plan-expiry` and record candidates.
Run `npm.cmd run db:backfill-plan-expiry -- --apply` once and record updated rows.
Run the dry-run again; candidates must be 0.

## 4. Deploy
Deploy the application containing Cookie + Bearer compatibility.

## 5. Smoke tests
- SMS login sets paperfix_session as HttpOnly/Secure/SameSite=Lax.
- Refresh preserves login without any JWT or paper text in localStorage.
- History still returns original and result text.
- A paid test order credits once and shows a 30-day expiry.
- Replaying the same callback does not change quota.
- A controlled expired account becomes free with quota 0.
- Two concurrent timeout polls refund exactly once.
- API responses have Cache-Control: private, no-store.
- Public responses contain CSP, HSTS, nosniff, referrer, permissions,
  COOP, and frame protection headers.

## 6. Rollback
Roll back the Vercel application to the recorded SHA.
Do not drop the additive columns. Old code ignores them and all history remains.
```

- [ ] **Step 2: Commit the rollout runbook**

```powershell
git add docs/deployment/security-hardening-rollout.md
git commit -m "docs: add security hardening rollout runbook"
```

- [ ] **Step 3: Run the complete automated verification suite**

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
$env:DATABASE_URL='postgresql://paperfix:paperfix@localhost:5432/paperfix'; npx.cmd prisma validate
git diff --check 69e6169..HEAD
```

Expected: every command exits 0.

- [ ] **Step 4: Run requirement-specific source audits**

```powershell
rg -n "DROP|DELETE FROM|TRUNCATE" prisma/migrations/20260809000000_security_hardening/migration.sql
rg -n "\btoken\b|planActivatedAt" src
rg -n "Access-Control-Allow-Origin|Access-Control-Allow-Credentials" vercel.json
rg -n "不留存(任何)?原文|技术术语零修改|±\s*5%|额度永久有效" src
rg -n "inputText|outputText" prisma/schema.prisma api/user/index.ts
git status --short
```

Expected:

- First four scans return no matches.
- The `inputText|outputText` scan proves schema/history retention still exists.
- `git status --short` is empty.

- [ ] **Step 5: Inspect the final diff requirement by requirement**

Run:

```powershell
git diff --stat 69e6169..HEAD
git diff 69e6169..HEAD -- prisma/schema.prisma prisma/migrations api src vercel.json index.html
```

Confirm all of the following from current source, not intent:

1. Expiry calculation and clear-to-free behavior are called before quota use.
2. Existing active expiry is the renewal base.
3. Browser auth uses HttpOnly Cookie and no frontend token.
4. SMS code is HMAC-only with 5-attempt, phone, and IP limits.
5. Payment route files cannot credit outside `order-settlement.ts`.
6. Job route cannot refund outside `job-refund.ts` or overwrite a timed-out job with late AI output.
7. Public copy states retention and 30-day expiry truthfully.
8. No history field or endpoint was removed.

- [ ] **Step 6: Commit verification-only corrections, if any**

```powershell
git status --short
```

Expected: no correction is necessary and `git status --short` is empty. If verification finds a defect, stage only the corrected files, rerun the focused and full suites, commit with a fix-scoped message, and repeat Steps 3–5.

- [ ] **Step 7: Stop before production mutation**

Report the verified local commit range and exact test/build results. Do not run `prisma migrate deploy`, the backfill with `--apply`, `vercel deploy`, `git push`, or a payment callback against production until the user explicitly authorizes deployment.
