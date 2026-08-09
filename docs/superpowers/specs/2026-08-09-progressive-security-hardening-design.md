# PaperFix 渐进式安全整改设计

日期：2026-08-09

状态：待用户复核

目标仓库：`whywbhydyq/paperfixes`
基线提交：`edb9a7a21e1901ae26aeb9f73cc79a4225460521`

## 1. 目标

在不删除任何用户原文、处理结果、任务历史、订单或充值记录的前提下，完成以下整改：

1. 将数据留存文案改成与真实产品行为一致。
2. 将所有付费套餐统一为 30 天有效，并由服务端执行续期、到期清零和恢复免费套餐。
3. 停止把 JWT 和论文原文持久化到 localStorage，改用 HttpOnly Cookie 会话。
4. 加固短信验证码生成、保存、验证和限流。
5. 增加站点安全响应头，删除错误的通配 CORS。
6. 将支付入账和额度变更放进同一个数据库事务。
7. 消除 AI 任务超时并发请求重复退款的窗口。

## 2. 明确决策

### 2.1 数据保留

- 保留 `Job.inputText`、`Job.outputText` 和最近 50 条历史记录功能。
- 不添加自动删除任务，不清理已有原文或结果，不增加用户删除接口。
- 页面明确说明：为提供处理服务和账号历史记录，PaperFix 会在账号存续期间保存用户提交的原文、处理结果、任务状态及必要技术记录。
- 页面继续提示用户不要提交未公开科研数据、商业秘密、个人敏感信息等内容。
- 删除“处理完成后不留存任何原文”“不留存原文”等与实际行为不一致的承诺。

### 2.2 产品表述

- 不新增术语、字数或 AI 检测结果验证系统。
- 删除“技术术语零修改”“输出字数控制在原文 ±5% 以内”等绝对表述。
- 保留“术语保护”“字数控制”“降低 AI 率”等现有产品定位，不把本轮安全整改扩展成 AI 引擎重构。

### 2.3 付费套餐有效期

- 所有付费套餐有效期统一为 30 天。
- 首次成功购买：`planExpiresAt = paidAt + 30 天`。
- 有效期内再次购买：`planExpiresAt = 当前 planExpiresAt + 30 天`。
- 已过期后再次购买：`planExpiresAt = paidAt + 30 天`。
- 购买不同付费套餐时，账号套餐立即切换为新订单的 `planKey`，有效期仍按上述规则叠加。
- 到期后，服务端以原子更新完成：
  - `plan = "free"`
  - `quota = 0`
  - `planExpiresAt = null`
- 到期判断不再依赖浏览器保存的 `planActivatedAt`。

## 3. 范围外事项

- 不删除数据库中的历史原文、结果、订单、充值或用户数据。
- 不实现论文内容 TTL 或历史记录删除功能。
- 不新增术语一致性、字数 ±5%、语义一致性或 AI 检测器验证。
- 不在本轮迁移到 Next.js、Astro 或其他 SSR 框架。
- 不改变套餐价格、套餐额度或 AI 模型配置。
- 不主动修改生产数据库；仓库只提交可审计的 Prisma migration，生产迁移必须在部署步骤中单独执行。

## 4. 总体架构

整改拆成四个可独立验证的批次：

1. **真实文案与服务端套餐权益**
2. **Cookie 会话、验证码与响应头**
3. **支付事务与并发退款**
4. **全量回归、构建和部署检查**

每个批次先增加失败测试，再写最小实现，避免一次性改动登录、支付和历史记录全部路径。

## 5. 数据模型

### 5.1 `User`

新增：

```prisma
planExpiresAt DateTime?
```

含义：当前付费套餐权益的服务端到期时间。免费用户为 `null`。

### 5.2 `SmsCode`

现有 `code` 字段继续使用，但保存 HMAC 摘要而不是明文验证码。新增：

```prisma
attempts  Int     @default(0)
requestIp String?
```

并增加 `requestIp, createdAt` 索引，用于 IP 发送限流。

### 5.3 `Order`

新增：

```prisma
providerTradeNo String? @unique
```

用于记录支付平台唯一流水号并加强重放幂等性。字段为 nullable，不影响已有订单。

### 5.4 迁移特性

- 所有字段都是新增 nullable 字段或带默认值字段。
- migration 不包含 `DROP`、`DELETE`、`TRUNCATE` 或历史数据重写。
- 新字段 migration 本身不改写用户权益；应用部署前另执行一条可审计的幂等回填语句：仅对 `plan != "free" AND planExpiresAt IS NULL` 的旧付费用户，将 `planExpiresAt` 设置为本次上线时间加 30 天。
- 上述回填给旧付费用户完整的 30 天过渡期，不清零其现有额度；过渡期结束后再由统一服务端到期检查清零并恢复免费套餐，避免旧套餐因缺少历史服务端到期时间而永久有效。
- 免费用户保持 `planExpiresAt = null`；已有非空到期时间绝不被回填覆盖。

## 6. 套餐权益模块

新增 `api/_lib/plan-entitlements.ts`，职责限定为套餐有效期计算与到期执行。

### 6.1 纯函数

```ts
calculateExtendedExpiry(now: Date, currentExpiry: Date | null): Date
```

规则：以 `currentExpiry > now ? currentExpiry : now` 为基准增加 30 天。

### 6.2 服务端到期执行

```ts
enforcePlanExpiry(userId: string, now?: Date): Promise<User>
```

使用条件更新，仅当 `plan != "free"` 且 `planExpiresAt <= now` 时清零额度、恢复免费套餐并清空到期时间。并发请求中只有第一个请求能够完成状态迁移，随后重新读取用户。

调用位置：

- 短信登录完成后
- 手机密码登录完成后
- 微信登录完成后
- `/api/user` 查询额度和历史前
- `/api/rewrite/submit` 扣减额度前
- 需要向前端返回当前套餐的管理接口

支付入账使用事务内版本，不在事务外重复读取。

## 7. Cookie 会话设计

### 7.1 Cookie

Cookie 名称：`paperfix_session`

属性：

- `HttpOnly`
- `Secure`（生产环境）
- `SameSite=Lax`
- `Path=/`
- `Max-Age=30 天`

JWT 的签名和 30 天过期时间保持不变。

### 7.2 服务端兼容策略

`getUserFromRequest()` 按以下顺序读取：

1. `paperfix_session` Cookie
2. 旧的 `Authorization: Bearer` Header

Bearer 只作为渐进迁移兼容路径；新前端不再发送或保存 Token。

登录成功接口使用 `Set-Cookie`，不再要求前端把 JWT 写入 Zustand。新增 `/api/auth/logout` 清除 Cookie。

手机号密码登录对“手机号不存在”“尚未设置密码”和“密码错误”统一返回同一认证失败信息，避免在认证前泄露账号是否存在。

### 7.3 前端状态

- 从 Zustand 持久化内容中删除 `token`、`inputText` 和 `planActivatedAt`。
- `inputText` 仍可存在于当前页面内存状态，登录弹窗打开关闭不会丢失当前输入，但刷新页面后不恢复。
- 保留 `user`、`isLoggedIn` 和不含正文的 `activeJob` 状态。
- API 请求显式使用 `credentials: "same-origin"`，不再主动添加 Authorization Header。
- 登出时先调用 `/api/auth/logout`，再清理前端用户状态。

## 8. 短信验证码设计

### 8.1 生成与保存

- 使用 `crypto.randomInt(0, 1_000_000)` 生成六位验证码。
- 使用服务端密钥对 `phone + code` 计算 HMAC-SHA256，数据库只保存摘要。
- 摘要比较使用恒定时间比较。
- 生产环境缺失短信 Access Key/Secret 时返回配置错误，不打印验证码、不返回 `devCode`。
- 非生产环境可以保留明确的开发模式返回值。

### 8.2 发送限制

- 同一手机号：60 秒内最多 1 次，24 小时最多 10 次。
- 同一 IP：1 小时最多 20 次，24 小时最多 100 次。
- 超出限制统一返回 429，不调用短信供应商。

### 8.3 验证限制

- 每个验证码最多允许 5 次失败尝试。
- 错误时原子增加 `attempts`。
- 成功时通过条件更新把 `used=true`，只有第一个成功请求能消费验证码。
- 已使用、已过期或尝试次数达到上限时返回统一错误，不泄露具体状态。

## 9. 安全响应头与 CORS

### 9.1 CORS

- 删除 `/api/*` 上的 `Access-Control-Allow-Origin: *`。
- 删除 `Access-Control-Allow-Credentials: true` 等全局 CORS 头。
- 当前前端和 API 同域，不需要跨域许可。
- 对浏览器发送的状态变更请求，如果存在 `Origin`，服务端验证其 Host 与当前请求 Host 一致；支付平台回调不使用该检查，而继续依赖签名和订单校验。

### 9.2 响应头

站点增加：

- Content-Security-Policy
- Strict-Transport-Security
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- Cross-Origin-Opener-Policy
- X-Frame-Options

API 统一增加：

```http
Cache-Control: private, no-store
```

移除当前证书错误且会被 CSP 拦截的百度 push 脚本。保留 Google Analytics 所需的最小 CSP allowlist。

## 10. 支付入账设计

新增 `api/_lib/order-settlement.ts`，由异步回调和主动查单共用。

```ts
finalizePaidOrder(input: {
  orderId: string;
  providerTradeNo: string;
  paidAmount: string | number;
  paidAt?: Date;
}): Promise<"credited" | "already_paid">
```

### 10.1 入账前验证

- 订单存在。
- 订单状态为 `PENDING` 或已是 `PAID`。
- 支付金额按“分”转换后与数据库订单金额完全一致。
- 支付平台返回订单号与本地订单号一致。
- `providerTradeNo` 不得属于其他订单。

### 10.2 单事务入账

一个 Prisma interactive transaction 内依次完成：

1. 条件更新订单 `PENDING -> PAID` 并保存 `providerTradeNo/paidAt`。
2. 读取用户当前 `planExpiresAt`。
3. 计算叠加 30 天后的新到期时间。
4. 如果旧付费套餐在付款时已经过期，先按到期规则丢弃其陈旧剩余额度，再把额度设置为本次订单额度；否则在当前有效额度上增加订单额度。
5. 设置新套餐和 `planExpiresAt`。
6. 创建 Topup 记录。

任何一步失败则全部回滚。重复回调因第一步条件更新不再命中而返回 `already_paid`，不重复增加额度。

## 11. AI 任务超时退款设计

新增 `api/_lib/job-refund.ts`：

```ts
refundTimedOutJob(jobId: string, userId: string, now?: Date): Promise<boolean>
```

一个事务内：

1. `updateMany` 条件限制为指定用户、指定任务、状态为 `PENDING/PROCESSING`。
2. 只有更新数为 1 时才增加一次用户额度并减少一次 `totalUsed`。
3. 更新数为 0 时返回 `false`，调用端重新读取最终任务状态，不再退款。

两个并发超时请求只能有一个请求改变状态并返还额度。

## 12. 文案修改范围

至少检查并更新：

- `src/pages/PrivacyPage.tsx`
- `src/pages/FaqPage.tsx`
- `src/pages/HomePage.tsx`
- `src/components/Footer.tsx`
- `src/data/articles.ts`
- `src/pages/PricingPage.tsx`
- 管理端默认套餐配置和生产公开套餐配置显示逻辑

统一要求：

- 不出现“不留存原文”。
- 明确保留原文和结果用于历史记录。
- 不出现“技术术语零修改”和“±5%”绝对承诺。
- 所有付费套餐只显示“30 天有效”，不再出现“额度永久有效”。

## 13. 错误处理

- 短信配置缺失：生产返回 500 通用配置错误，不返回验证码。
- 验证码错误/过期/锁定：统一 400 文案。
- 支付金额或订单信息不一致：不改变任何数据库状态，记录不含密钥的结构化错误。
- 支付事务失败：订单保持 PENDING，允许支付平台安全重试。
- 套餐到期并发请求：条件更新保证只清零一次。
- 任务退款并发请求：条件更新保证只退款一次。
- Cookie 无效：返回 401，并让前端清理登录状态。

## 14. 测试策略

新增 Vitest，提供 `test` 和 `typecheck` scripts。

### 14.1 套餐

- 无当前有效期：从付款时间增加 30 天。
- 当前有效期仍有效：从当前有效期叠加 30 天。
- 当前有效期已过：从付款时间重新增加 30 天。
- 到期后额度清零、套餐恢复 free。
- 两个并发到期检查只执行一次状态迁移。

### 14.2 验证码

- 始终生成六位数字。
- 数据库保存值不等于明文验证码。
- 正确验证码通过，错误验证码失败。
- 第五次错误后锁定。
- 生产缺少短信配置时不返回 `devCode`。

### 14.3 认证

- Cookie 可被服务端识别。
- Bearer 兼容路径仍可识别。
- 登录响应设置 HttpOnly Cookie。
- 登出响应清除 Cookie。
- 新前端持久化状态中不含 token、inputText、planActivatedAt。

### 14.4 支付

- 正确金额首次回调只入账一次。
- 重复回调不重复增加额度。
- 金额不一致时零状态变更。
- 事务任一步失败时订单、额度、Topup 全部回滚。
- 有剩余有效期时正确叠加 30 天。

### 14.5 退款

- 第一个超时请求退款一次。
- 第二个并发请求不再次退款。
- 非任务所有者无法触发退款。

### 14.6 全量验证

- `npm test`
- `npm run typecheck`
- `npm run build`
- 检查 Prisma migration 无删除语句。
- 检查 Git diff 不包含历史数据导出、密钥或无关重构。

## 15. 部署与回滚顺序

1. 备份数据库并记录 User/Order/Job/Topup 行数。
2. 应用仅新增字段的 Prisma migration。
3. 在同一维护窗口内记录固定的上线时间，并用幂等 SQL 只为 `plan != "free" AND planExpiresAt IS NULL` 的旧付费用户回填“上线时间 + 30 天”；执行前后记录命中行数。
4. 部署兼容 Cookie 与 Bearer 的服务端和新前端。
5. 验证登录、历史记录、套餐、支付测试订单、到期清零和失败退款。
6. 观察错误日志后，再在后续版本移除 Bearer 兼容读取。

回滚时旧代码会忽略新增 nullable 字段；migration 不删除数据，因此可先回滚应用，不需要回滚数据库列。

## 16. 完成标准

只有同时满足以下条件才算完成：

- 所有留存文案与实际数据库行为一致。
- 历史原文和结果仍可由原有历史接口读取。
- 付费套餐有效期由服务端保存和执行，续购叠加 30 天，到期清零并恢复免费套餐。
- 新前端不再把 JWT、原文或前端套餐到期时间持久化到 localStorage。
- 生产短信配置缺失不会泄露验证码。
- 支付入账是单事务且重复回调不重复加额度。
- 并发超时请求最多退款一次。
- 安全头存在，错误 CORS 已删除。
- 新增测试、类型检查和生产构建全部通过。
- migration 和代码均未删除历史原文、结果、订单或充值记录。
