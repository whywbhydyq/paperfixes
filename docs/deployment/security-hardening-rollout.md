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

Safety limits and locking semantics:

- Dry-run uses ordinary, unlocked reads only: no interactive transaction, advisory lock, or `FOR UPDATE`. Its count and digest are evidence for review, not a snapshot guarantee; apply re-reads and re-validates the live set inside its transaction.
- Apply uses a fail-fast transaction advisory lock, a 5-second database row-lock timeout, and Prisma transaction limits of 2 seconds `maxWait` / 15 seconds `timeout`.
- At most 1,000 candidates are accepted. If either mode reports `BACKFILL_CANDIDATE_LIMIT_EXCEEDED`, stop and use a separately reviewed manual batching procedure; do not enlarge the `IN` update ad hoc.
- Lock contention or malformed lock results fail with a stable safe error and zero updates.

以下内容是待执行的运维步骤，不得声称已执行。先安排维护窗口并完成数据库备份；维护窗口内暂停会改变套餐状态的后台操作。

将 `PLAN_EXPIRY_BACKFILL_AT` 设置为同一个固定 UTC 时间戳，且必须使用严格毫秒格式（例如 `2026-08-09T00:00:00.000Z`），并在以下三步中保持不变。偏移时区、缺少 `Z` 或缺少毫秒的值都会被拒绝。

执行顺序必须为 `dry-run → apply → dry-run=0`：

1. 运行 `npm.cmd run db:backfill-plan-expiry`。记录输出的 `candidates`、`digest`、`planCounts` 和 `expiresAt`；输出不包含用户 ID、手机号或连接信息。
2. 检查 `planCounts`。发现未知或停用套餐、空套餐或异常 free 候选时立即停止，不得 apply；修正权威 `pricing_plans` 配置或数据后重新 dry-run。
3. 保持同一个 `PLAN_EXPIRY_BACKFILL_AT`，设置：
   - `PLAN_EXPIRY_BACKFILL_EXPECTED_COUNT` 为刚记录且大于 0 的 `candidates`；
   - `PLAN_EXPIRY_BACKFILL_EXPECTED_DIGEST` 为刚记录的 SHA-256 `digest`。
4. 运行 `npm.cmd run db:backfill-plan-expiry -- --apply`。实时 count 或 digest 与记录不一致时脚本会失败且不更新；成功时 `updated` 必须等于 expected count。
5. 使用同一个固定时间再次运行 dry-run，确认 `candidates=0`。不得以 expected count 0 执行 apply。

脚本在单个数据库事务中获取全局 advisory lock 和候选用户行锁，再读取、校验和更新；仍应保持维护窗口直到最终 dry-run 为 0。

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
