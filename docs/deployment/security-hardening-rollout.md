# Security Hardening Rollout

## 1. Preflight

- Record the deployed Git SHA and Vercel deployment URL.
- Back up PostgreSQL.
- Record counts for User, Job, Order, and Topup.
- Confirm `JWT_SECRET`, `SMS_CODE_SECRET`, `ALIYUN_ACCESS_KEY_ID`,
  `ALIYUN_ACCESS_KEY_SECRET`, and `SITE_URL`.
- EPAY 已退役；不要恢复或配置 `EPAY_PID`、`EPAY_KEY`、`EPAY_API`。

## 2. Additive migration

Run `npx.cmd prisma migrate deploy`.

Inspect the migration first and confirm it contains no `DROP`, `DELETE`, or `TRUNCATE`.

## 3. Legacy plan dry-run and apply

将 `PLAN_EXPIRY_BACKFILL_AT` 设置为同一个固定 UTC 时间戳，并在以下三步中保持不变。

执行顺序必须为 `dry-run → apply → dry-run=0`：

Run `npm.cmd run db:backfill-plan-expiry` and record candidates.

Run `npm.cmd run db:backfill-plan-expiry -- --apply` once and record updated rows.

Run the dry-run again; candidates must be `0`.

## 4. Deploy

Deploy the application containing Cookie + Bearer compatibility.

## 5. Smoke tests

- SMS login sets `paperfix_session` as `HttpOnly`/`Secure`/`SameSite=Lax`.
- Refresh preserves login without any JWT or paper text in localStorage.
- History still returns original and result text.
- A paid test order credits once and shows a 30-day expiry.
- Replaying the same callback does not change quota.
- A controlled expired account becomes free with quota 0.
- Two concurrent timeout polls refund exactly once.
- API responses have `Cache-Control: private, no-store`.
- Public responses contain CSP, HSTS, nosniff, referrer, permissions,
  COOP, and frame protection headers.

## 6. Rollback

Roll back the Vercel application to the recorded SHA.

Do not drop the additive columns. Old code ignores them and all history remains.
