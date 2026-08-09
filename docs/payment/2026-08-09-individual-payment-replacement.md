# PaperFix 无公司主体支付替代调研与迁移建议

**调研日期：2026-08-09**  
**适用现状：** 中国大陆个人开发者、没有公司或个体工商户营业执照；PaperFix 销售 30 天一次性套餐；原“巴巴博弈”EPAY 通道已停止服务。  
**本次范围：** 只读审计、方案调研和迁移边界设计。本文没有修改生产支付代码、数据库、环境变量，也没有部署。

## 1. 结论先行

1. **立即停止旧 EPAY 收款。** 不再让用户看到仍可支付的支付宝/微信按钮，不再接受旧回调，不把长期 `PENDING` 订单当成付款凭证。
2. **首选试申请 Paddle，但必须先通过审核再开发生产接入。** Paddle 官方当前允许 `individual / sole trader`，中国不在不支持国家名单中；其 Checkout 已支持中国用户使用支付宝和微信支付，且不要求卖家持有中国支付商户号或中国公司。Paddle 的微信支付只支持桌面端的一次性 CNY/USD 订单，恰好适合 PaperFix 当前的 30 天一次性套餐；支付宝支持 CNY 一次性支付和订阅，但需要额外审批。
3. **Paddle 对 PaperFix 存在真实的审核失败风险。** Paddle 2026-04-13 更新的 AUP 明确禁止 `essay and paper mills, ghostwriting services`。PaperFix 必须如实证明它是用户自有文本的编辑/润色软件，而不是代写、论文工厂或帮助学术欺诈的服务。不能为了过审伪造业务描述。审核未通过前，不能承诺这条路线一定能上线。
4. **最快的个人备用方案是“爱发电售卖数字商品/会员 + 一次性激活码”。** 爱发电条款覆盖自然人创作者及软件程序、定制服务等内容，官方支持微信/支付宝，平台费与支付费合计 6%，支持自动随机发放激活码。用户付款后拿到激活码，再到 PaperFix 兑换，能够实现接近即时到账，且无需监控个人收款码。
5. **不要寻找另一个匿名“易支付/个人免签/个人码监控”通道。** 个人收款码本身没有面向网站的可信订单 API、签名回调、退款和争议闭环；监听通知、轮询账单或代挂二维码不是稳定的支付接口。
6. **长期最稳方案是办理个体工商户，而不是注册公司。** 个体工商户与公司不是同一主体形式。取得与实际业务相符的营业执照后，再申请微信支付/支付宝官方产品，长期成本和控制力通常优于平台中转。

### 推荐路径

```text
今天：关闭 EPAY 与付费入口
  ├─ 同时申请 Paddle 个人卖家 + 域名审核 + 微信/支付宝能力
  │    ├─ 审核通过：接 Paddle，正式自动到账
  │    └─ 审核拒绝：不绕过审核，转爱发电激活码
  ├─ 同时向爱发电客服书面确认 PaperFix 数字服务可上架
  │    └─ 确认后：先做激活码交付，后做 Webhook/API 对账
  └─ 中长期办理个体工商户，迁移到官方微信/支付宝
```

## 2. 当前代码只读审计

### 2.1 当前支付链路

| 文件 | 当前作用 | 现状 |
|---|---|---|
| `api/payment/create.ts` | 从数据库读取套餐，创建 `PENDING` 订单，按 EPAY V1 规则生成 MD5 签名并提交到 `submit.php` | 完全绑定 `EPAY_PID`、`EPAY_KEY`、`EPAY_API`；通道下线后无法工作 |
| `api/payment/notify.ts` | 校验 EPAY MD5、商户号、状态、订单号和金额，再调用统一结算 | 依赖旧 EPAY；未按 provider 隔离；停用后应拒绝旧回调 |
| `api/payment/status.ts` | 用户轮询订单；10 秒后调用 EPAY `api.php?act=order` 补查 | 会把 EPAY key 放进查询 URL；供应商下线后订单长期停留 `PENDING` |
| `api/_lib/order-settlement.ts` | 金额匹配、交易号去重、条件更新、用户额度和 30 天有效期入账 | 这是应保留的核心；已具备事务、幂等、重复交易号保护和有效期叠加 |
| `src/pages/PricingPage.tsx` | 创建订单、POST 跳转旧支付页、3 秒轮询状态 | 默认假定支付通道存在 |
| `src/components/PaymentModal.tsx` | 固定展示“支付宝/微信支付”，宣称自动检测和即时到账 | 在通道关闭时会误导用户 |

### 2.2 已有结算层值得保留的部分

- 服务器从数据库读取套餐价格和额度，不信任前端金额。
- `providerTradeNo` 唯一，阻止同一外部交易号给多个订单入账。
- `PENDING -> PAID` 使用条件更新，并与额度、套餐、有效期、充值记录放在同一事务。
- 续费从当前剩余有效期后叠加 30 天；已过期套餐重新从付款时刻计算。
- 金额转分后比较，避免简单浮点直接等值判断。

### 2.3 当前缺口

1. `Order` 没有 `provider`、`currency`、整数分金额、外部 price/product ID、过期时间和退款状态，无法安全共存多个支付提供方。
2. EPAY 停用没有默认关闭开关；前端仍显示可付款。
3. 订单没有自动过期状态，旧 `PENDING` 会一直存在。
4. 没有支付退款/拒付后的权益冲正账本。当前 `job-refund` 只是任务失败退还一次调用额度，不是支付退款。
5. `Float amount` 不适合继续扩展多币种支付，应迁移为 `amountCents Int` + `currency`。
6. `status.ts` 通过 URL 查询参数发送供应商密钥，不应复制到任何新提供方。
7. 前端支付成功页不能作为入账依据；只能以签名 Webhook 或提供方服务端查询结果为准。

### 2.4 管理员手动充值不是支付结算替代品

`api/admin/index.ts?resource=topup` 当前会在管理员鉴权后，以事务创建 `Topup` 并增加额度，但：

- 没有外部收款单号唯一约束，重复点击或重复处理可能二次充值；
- 不核对实收金额与套餐价格；
- 不把用户切换到所购套餐，也不叠加 30 天有效期；
- 不能自动判断退款、拒付或伪造付款截图。

因此它只能用于**赠送额度、客服补偿或极短期人工兜底**，不能直接作为线上售卖套餐的正式到账链路。

## 3. 真实性与可行性矩阵

| 方案 | 无公司/无营业执照可申请 | 中国用户微信/支付宝 | 自动到账 | 费用与结算 | 退款/风控 | 结论 |
|---|---|---|---|---|---|---|
| **Paddle MoR** | **可以申请个人或 sole trader**；个人不做 business verification，但仍需域名和身份审核。中国未列入其不支持国家 | 微信：桌面端、一次性、CNY/USD；支付宝：CNY、全平台，但需额外审批 | **有**。使用签名 Webhook，以 `transaction.completed` 入账；微信为延迟捕获，最长可能约 10 分钟 | 标准价 **5% + US$0.50/笔**；低于 US$10 的产品可联系定制价。余额满 US$100 后按月结算，通常月初生成、15 日前发送，可用 wire/Payoneer，某些跨境汇款可能有 US$15 SWIFT 费 | 支持全额/部分退款；多数 live 退款需平台审批。拒付会扣订单金额及相应费用。域名、产品与 KYC 审核严格 | **首选试申请，但不能保证 PaperFix 过审** |
| **爱发电 + 激活码** | 条款覆盖自然人用户/创作者；结算会要求个人身份和收款资料 | 官方称现有支付方式为微信、支付宝 | **可实现近实时**：平台自动随机发激活码，用户在 PaperFix 兑换。另有 Webhook/API，但文档提示 Webhook 可能重复且不保证及时 | 总计 **6%**；创作者得 94%。当月收益下月 1 日后进入余额，再提现 | 平台可协调售后、冻结订单并决定退款/结算；仍有账号与内容审核风险 | **最快备用方案**；先取得客服书面确认再上架 |
| **爱发电 Webhook 直接入账** | 同上 | 同上 | **条件性有**。订单 Webhook + 查询 API 可对账，但还必须安全绑定爱发电用户与 PaperFix 用户；不能按昵称、备注或截图入账 | 同上 | Webhook 会重复/漏送，必须幂等并用查询 API 补偿；API 文档较旧，需实测 | 第二阶段再做；不如激活码快 |
| **微信支付“小微商户”服务商进件** | 仅能由已获权限的普通服务商替小微商户进件，需身份证、银行卡和真实经营辅助材料 | 微信 | 技术上可由服务商 Native/JSAPI 回调自动到账 | 费率取决于服务商和行业；官方说明通常 T+1 自动到个人银行卡 | 官方目前仅开放指定线下行业，并明确暂不支持线上虚拟行业；误报类目可被关闭支付权限 | **PaperFix 不应把它当稳定方案**；只有获授权服务商书面确认真实类目可进件时才复核 |
| **支付宝个人商户/当面付** | 官方页面存在“个人商户、营业执照非必选”的当面付进件说明，但要求真实门头、内景等线下经营材料 | 支付宝 | 获批后可用官方 API | 以实际签约费率为准 | PaperFix 是线上 SaaS，与“当面付”线下材料明显不匹配；电脑/手机网站支付是否向该个人账号开放必须以后台实际签约结果为准 | **只能真实试申请，不能承诺可用**；不得伪造门店照片或经营类目 |
| **直接微信 Native 普通商户** | **不行**。官方 Native 普通商户主体支持个体工商户、企业、事业单位、政府机关、社会组织，不含普通自然人 | 微信 | 获批主体有官方回调 | 官方签约费率和结算规则 | 合规和产品审核 | 等办好个体工商户后再接 |
| **Paddle 之外的海外 MoR/Gumroad** | 部分支持个人和跨境结算 | 对中国用户通常以卡/PayPal为主；未找到可替代当前微信二维码体验的一手承诺 | 通常有 Webhook | 跨境费率、最低结算额、KYC 和外汇成本 | 账号审核、冻结和退款规则依平台 | 不作为当前国内主方案；Paddle 已有更明确的中国钱包支持 |
| **个人微信/支付宝二维码 + 自动监听** | 个人码可收款，但不是网站支付 API | 有二维码 | **没有合法稳定的官方自动回调** | 看似低费率，实则无法可靠对账 | 易遇到限额、风控、错单、同额订单碰撞；退款和争议靠人工 | **不采用** |
| **人工转账 + 管理员手动充值** | 可以人工收款 | 可人工扫码 | **没有** | 人工成本高 | 截图可伪造、重复处理、无法保证即时到账，且现有后台不叠加套餐有效期 | 仅用于少量客服补偿，不作为公开支付方式 |

## 4. 为什么 Paddle 是首选申请，但不是“保证可用”

### 4.1 对个人主体的真实支持

- Paddle 的[账号验证说明](https://www.paddle.com/help/start/account-verification/what-is-account-verification)明确写明：`individuals or sole traders` 不需要 business verification，但需要 domain review 和 identity verification。
- Paddle 的[支持国家列表](https://www.paddle.com/help/legal/sanctions/which-countries-are-supported-by-paddle)称其服务世界各地的软件业务，并列出不支持国家；中国不在该列表中。平台仍可按 KYC/AML 要求索取补充资料或拒绝放款。
- [身份验证说明](https://www.paddle.com/help/start/account-verification/what-is-identity-verification)要求个人卖家本人完成身份验证，可能需要身份证件、地址证明和活体检查。

### 4.2 中国钱包支持

- [Paddle 微信支付文档](https://developer.paddle.com/concepts/payment-methods/wechat/)写明无需微信商户号或中国实体；只在桌面端向中国地址、CNY/USD 一次性订单展示微信支付。微信是延迟捕获方式，授权后可能最多约 10 分钟才成为 `completed`。
- [Paddle 支付宝文档](https://developer.paddle.com/concepts/payment-methods/alipay/)写明无需支付宝商户号或中国实体；支持中国地址、CNY、一次性和订阅，但需要单独申请支付宝能力。
- 30 天套餐当前是用户主动再次购买、系统叠加有效期，不是支付机构自动续费。因此可以把每次购买建成 Paddle 的 **one-time item**，同时覆盖微信和支付宝。

### 4.3 PaperFix 的审核风险

Paddle 的[可接受使用政策](https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle)明确禁止论文工厂和代写服务。PaperFix 站点审核时应能证明：

- 产品只处理用户自行提供且有权处理的文本；
- 产品是编辑、润色和表达改进工具，不代写整篇论文，不伪造研究、数据、引用或结论；
- 定价、交付内容、退款政策、服务条款和隐私政策都可从导航直接访问；
- 提供真实可用的测试账号或演示流程；
- 售后邮箱、经营者品牌/法定姓名和服务说明真实一致。

当前站点“AI 论文降重/降低 AI 率”定位可能让审核人员把它归入高风险学术服务。只能如实解释实际功能边界，**不能换个假名字继续提供被禁止的服务**。若 Paddle 明确拒绝，停止此路线。

### 4.4 成本不一定适合 ¥29 小套餐

Paddle [公开定价](https://www.paddle.com/pricing)是每笔 5% + US$0.50。固定 US$0.50 对 ¥29 套餐占比很高；官网提示低于 US$10 的产品可以联系定制价。因此在生产接入前必须拿到 PaperFix 的实际报价。可以考虑：

- 保留 ¥99 套餐使用 Paddle；
- 把 ¥29 小包改成更高额度/更高客单价；或
- 获得 Paddle 的小额交易定制费率后再决定。

不应在未拿到定制报价前虚构人民币成本。

## 5. 爱发电备用方案

### 5.1 为什么它适合个人临时过渡

- [爱发电使用条款](https://afdian.com/term)把用户定义为自然人、法人或非法人组织，创作者内容可包括软件程序、定制服务等；平台统一收款后结算。
- [创作者 FAQ](https://guide.afdian.com/faq/faq-for-creators)写明支付渠道为微信和支付宝，总费用 6%，创作者获得 94%，当月收益下月 1 日后进入余额。
- [创作者进阶](https://guide.afdian.com/creator/creator-level-up)明确支持“自动随机回复”逐行发放激活码，也支持数字商品。
- [开发者 API 和 Webhook](https://guide.afdian.com/creator/developer)提供成功订单 Webhook 和订单查询 API，并明确提醒 Webhook 可能重复、服务器异常时不保证及时推送，因此必须做幂等和查询补偿。

### 5.2 第一版：激活码交付，不直接绑定 Webhook

1. 在爱发电创建与 PaperFix 套餐一一对应的数字商品/会员方案。
2. PaperFix 预生成一批高熵一次性激活码，只把明文码导入爱发电自动随机回复；数据库只保存哈希。
3. 用户在爱发电付款后自动拿到激活码。
4. 用户登录 PaperFix，在“兑换套餐”输入激活码。
5. PaperFix 原子地标记激活码已用，并按现有规则增加额度、切换套餐、在剩余有效期后叠加 30 天。
6. 激活码被重复使用时返回“已兑换”，不能再次增加额度。

这条链路的“付款”由爱发电完成，“权益到账”由用户兑换码触发，不需要读取个人微信通知，也不依赖付款截图。

### 5.3 第二版：Webhook/API 自动入账

只有在爱发电确认 PaperFix 可售、开发者 API 实测可用、且完成用户身份绑定设计后才实施：

- 使用爱发电 OAuth2 把 `user_private_id` 与 PaperFix 用户绑定；OAuth2 接入参数需向爱发电申请。
- 或由平台正式支持的自定义订单字段携带 PaperFix 本地订单 ID；在客服书面确认之前不能依赖未正式承诺的 URL 参数。
- Webhook 只接收 `status=2` 的成功订单，校验签名、白名单 `plan_id/SKU`、金额、唯一 `out_trade_no`。
- 先以订单查询 API 对账，再调用统一结算；Webhook 重复、乱序或漏送都不得重复入账。
- 不按昵称、留言、手机号或截图匹配用户。

## 6. 分阶段执行方案

### 阶段 0：立即止损（今天）

#### 业务操作

1. 在后台把所有付费套餐 `active=false`，只保留免费套餐，阻止前端继续产生新付费意图。
2. 页面显示“支付通道维护中，暂不收款”，不要继续展示支付宝/微信可付款按钮。
3. 从 Vercel 的 Production、Preview、Development 环境移除 `EPAY_API`、`EPAY_PID`、`EPAY_KEY`，并重新部署；旧 key 视为失效，不复用到任何新服务。
4. 保留旧订单和充值历史，不删除数据库记录。
5. 导出旧提供方最后一份订单/结算流水；若后台已无法访问，只能按实际银行入账和用户订单逐笔人工核对，不能用截图批量补发额度。

#### 下一次代码发布的止损改造

- 新增 `PAYMENT_PROVIDER=disabled|paddle|afdian_voucher`，默认值必须是 `disabled`。
- `disabled` 时，`create` 返回结构化 `503 PAYMENT_UNAVAILABLE`，前端显示维护状态。
- 旧 EPAY `notify` 在禁用后返回 `410 Gone`，不能继续验签或入账。
- `status` 不再调用旧 EPAY；超过有效窗口的旧订单标记 `EXPIRED`，但不删除。
- 前端支付方式必须来自服务端 capabilities，不能硬编码“支付宝/微信”。

### 阶段 1：并行做真实审核，不先写生产支付代码（1～7 个工作日）

#### Paddle

准备：

- 本人法定姓名、身份证件、真实居住地址及地址证明；
- 可接收 wire 或 Payoneer 的本人账户；
- PaperFix HTTPS 正式域名；
- 产品说明、套餐价格、交付内容、隐私政策、服务条款、退款政策、客服邮箱；
- 可供审核人员体验的测试账号；
- 对“用户自有文本编辑工具、非代写”的真实产品说明。

步骤：

1. 注册 Paddle Billing 的个人/sole trader 账号和单独的 Sandbox。
2. 先在 Sandbox 建立 CNY one-time products，验证 Checkout 和 Webhook，不做自购测试。
3. 提交 PaperFix 域名审核。Paddle 的[域名审核要求](https://www.paddle.com/help/start/account-verification/what-is-domain-verification)明确要求产品说明、价格、交付内容、条款、退款政策、隐私政策、品牌/个人法定姓名和 HTTPS。
4. 完成身份与收款账户验证。
5. 申请支付宝能力并开启微信支付。
6. 只有收到 live approval、确认中国个人收款账户可结算且实际费率可接受，才进入生产代码接入。

#### 爱发电

1. 以自然人创作者完成身份和提现账户验证。
2. 把 PaperFix 的真实功能、价格、30 天有效期、用户数据处理和退款规则发给官方客服，要求书面确认能否上架。
3. 创建测试数字商品，验证微信/支付宝、自动随机发码、退款和提现流程。
4. 只有确认可售后，才生成正式激活码库存。

### 阶段 2A：Paddle 审核通过后的生产接入

1. 复用现有三个 URL：`/api/payment/create`、`/api/payment/notify`、`/api/payment/status`，不要为了迁移增加 Vercel Function 数量。
2. `create` 在服务端把 `planKey -> Paddle price_id` 固定映射，创建/打开 Paddle Checkout；本地订单保存 provider、currency、amountCents 和 Paddle transaction ID。
3. `notify` 必须使用原始请求体和 `Paddle-Signature` 做 HMAC-SHA256 验签。官方[签名文档](https://developer.paddle.com/webhooks/about/signature-verification/)要求对 `timestamp:rawBody` 验证，并防重放。
4. 微信支付不能在 `checkout.completed` 时入账。Paddle 明确说明微信为 deferred capture；必须等 [`transaction.completed`](https://developer.paddle.com/webhooks/transactions/transaction-completed/) 后再结算。
5. Webhook 事件 ID、Paddle transaction ID 和本地 order ID 都必须唯一；金额、币种、price ID、planKey、用户必须与本地订单完全一致。
6. `status` 只允许登录用户查询自己的订单，并以 Paddle 服务端 API 作为 Webhook 的补偿查询，不能接受前端自报“已支付”。
7. Paddle live Webhook 在失败时最多 3 天重试 60 次；处理仍需幂等。官方[投递说明](https://developer.paddle.com/webhooks/about/respond-to-webhooks/)要求五秒内响应且不保证顺序。
8. 退款走 Paddle adjustment API 或后台；等 `adjustment.updated` 最终状态后，再执行内部权益冲正。

### 阶段 2B：Paddle 不通过、爱发电确认可售

1. 上线激活码表、管理员批量导入、用户兑换页和审计日志。
2. 首批只发行有限库存；每日核对爱发电已售数量和 PaperFix 已兑数量。
3. 验证稳定后再考虑 OAuth2 + Webhook/API 自动绑定。
4. 爱发电一旦拒绝该产品或停止服务，立即停止发新码；已售未兑码仍需按承诺处理。

### 阶段 3：办理个体工商户，迁移官方支付

个体工商户不是公司。国家市场监管总局 2025 年施行的[《个体工商户登记管理规定》](https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/fgs/art/2025/art_521d2635c33c4a439f638905ed92056c.html)要求登记经营范围、经营场所、经营者姓名和住所。仅通过网络经营的平台内经营者可在满足条件时使用平台提供的网络经营场所；单纯域名/虚拟主机地址不能作为该类登记场所。

完成登记后：

- 以真实“软件/信息技术服务”等当地允许的经营范围申请支付产品；
- 申请官方微信支付普通商户和支付宝网页/移动支付；
- 接官方 API v3/RSA 签名、回调、查询和退款；
- 依法完成年度报告、税务和经营者信息公示；
- 再逐步从 Paddle/爱发电迁回自有支付。

## 7. 生产代码改造边界

本节是未来实施边界，本次没有修改这些文件。

### 7.1 数据模型

`Order` 至少新增或迁移为：

- `provider`: `PADDLE | AFDIAN_VOUCHER | WECHAT | ALIPAY | LEGACY_EPAY`
- `currency`: 如 `CNY`
- `amountCents`: 整数分，不再以 `Float` 作为支付真值
- `providerOrderId` / `providerTransactionId`: 唯一
- `providerPriceId`: 用于固定映射套餐
- `expiresAt`
- `refundedAt`、`refundStatus`、`providerRefundId`

新增 `PaymentEvent`：

- `(provider, eventId)` 唯一；
- 保存事件类型、发生时间、处理状态、关联订单和必要审计摘要；
- 不保存支付密钥或完整敏感支付资料。

若采用激活码，新增 `RedeemCode`：

- 仅存 Argon2/HMAC 哈希和末四位展示；
- 记录 plan、quota、批次、状态、兑换用户、兑换时间；
- 一次性条件更新，与用户权益、Topup/订单记录放在同一事务。

### 7.2 服务端文件

- 保留 `api/_lib/order-settlement.ts` 的事务和幂等核心，但把金额改为整数分和明确币种。
- 增加 `_lib/payment-provider.ts` 适配层；新 `_lib` 不增加对外 Function 数量。
- 增加 `_lib/paddle.ts` 或 `_lib/afdian.ts`，分别负责签名、API 和事件规范化。
- 复用 `api/payment/create.ts`、`notify.ts`、`status.ts`；路由按 provider 分派。
- `api/admin/index.ts` 的人工补单必须要求唯一外部交易号、固定套餐和二次确认，并调用统一结算，不能直接裸增 quota。

### 7.3 前端文件

- `src/pages/PricingPage.tsx`：加载服务端支付 capabilities；关闭时明确显示维护状态。
- `src/components/PaymentModal.tsx`：不再硬编码支付宝/微信；Paddle 由 Checkout 决定可用方式，爱发电方案展示跳转和兑换入口。
- `src/lib/api.ts`：响应类型改为 provider-neutral，不再假设 `submitUrl + MD5 params`。

### 7.4 必须保留的安全与业务不变量

1. 套餐、价格、币种、额度均由服务端固定映射，前端不可覆盖。
2. 只在签名 Webhook/服务端查询确认最终成功后入账。
3. 同一个 provider transaction/event/code 只能入账一次。
4. 入账、权益、Topup/订单审计记录必须在同一数据库事务。
5. 30 天有效期继续从当前剩余有效期后叠加。
6. 退款、拒付和入账并发时只允许一个终态，不能出现双重退款或负额度。
7. 不保存完整支付密钥、身份证或银行卡资料；这些由提供方 KYC 系统保存。

## 8. 退款与权益冲正设计

当前系统没有支付退款账本。迁移时不能简单执行“用户 quota 减去套餐额度”，因为用户可能已经消费额度、购买过多个叠加套餐或收到管理员赠送额度。

建议新增不可变 `EntitlementGrant`：每次购买生成一笔 grant，记录来源订单、授予额度、已消耗额度和有效期区间。退款时：

1. 先按 provider refund/adjustment ID 做幂等；
2. 锁定订单和 grant；
3. 未使用 grant 可以全额撤回；
4. 已使用部分按公开退款政策、平台决定和适用规则处理，不能把用户总额度减成负数；
5. 记录 `REFUND_PENDING -> REFUNDED/REJECTED`，不能在外部退款仍待批准时先永久冲正；
6. Paddle 的全额/部分退款通过 [adjustment API](https://developer.paddle.com/api-reference/adjustments/create-adjustment/) 创建，最终状态由 Webhook 驱动；
7. 爱发电退款以平台订单最终状态为准，不能只听用户或客服消息。

## 9. 旧 EPAY 完整停用清单

- [ ] 付费套餐先设为 inactive，前台不再接受新订单
- [ ] 站点显示支付维护状态，不显示仍可用的支付图标
- [ ] 生产、预览、开发环境删除 `EPAY_API/PID/KEY`
- [ ] 重新部署并验证 `/api/payment/create` 无法创建旧通道订单
- [ ] 旧 `/api/payment/notify` 在代码发布后返回 `410`
- [ ] 停止 `/api/payment/status` 对 EPAY 的外部查询
- [ ] 旧密钥作废且不复用
- [ ] 保留所有 Order/Topup 数据和日志，不删除历史
- [ ] 将超过有效窗口的 `PENDING` 标记 `EXPIRED`
- [ ] 对旧平台最后流水与银行入账做一次人工对账
- [ ] 不依据付款截图、昵称或同金额猜测订单
- [ ] 退款/投诉联系方式持续可用

## 10. 无法由代码自动完成的事项

以下事项必须由账户本人在提供方后台或当地机构完成：

- Paddle/爱发电的实名认证、活体、地址和收款账户验证；
- Paddle 域名与产品审核、支付宝能力审批；
- 爱发电对 PaperFix 产品类目的书面确认；
- 旧 EPAY 已关闭后台时的最后资金流水核对；
- 银行/Paddle/Payoneer 的跨境入账资料和税务申报；
- 个体工商户登记、经营场所和经营范围审核；
- 微信/支付宝最终商户费率与行业审核。

如果 Paddle 和爱发电都拒绝 PaperFix，当前个人主体下**没有一个可以诚实承诺“微信二维码 + 官方自动回调 + 长期稳定”的替代方案**。正确做法是保持付费入口关闭，先办理个体工商户，而不是继续寻找个人免签通道。

## 11. 本次引用的一手资料

### Paddle

- [账号验证：个人/sole trader 不需要 business verification](https://www.paddle.com/help/start/account-verification/what-is-account-verification)
- [身份验证](https://www.paddle.com/help/start/account-verification/what-is-identity-verification)
- [域名审核要求](https://www.paddle.com/help/start/account-verification/what-is-domain-verification)
- [支持国家](https://www.paddle.com/help/legal/sanctions/which-countries-are-supported-by-paddle)
- [微信支付：无需中国实体；桌面端、一次性、CNY/USD](https://developer.paddle.com/concepts/payment-methods/wechat/)
- [支付宝：无需中国实体；需额外审批](https://developer.paddle.com/concepts/payment-methods/alipay/)
- [公开费率](https://www.paddle.com/pricing)
- [结算时间和方式](https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid)
- [AUP：论文工厂与代写禁止](https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle)
- [Webhook 签名](https://developer.paddle.com/webhooks/about/signature-verification/)
- [`transaction.completed`](https://developer.paddle.com/webhooks/transactions/transaction-completed/)
- [Webhook 重试与投递顺序](https://developer.paddle.com/webhooks/about/respond-to-webhooks/)
- [退款/adjustment](https://developer.paddle.com/build/transactions/create-transaction-adjustments/)

### 爱发电

- [使用条款：自然人、软件程序、平台收款结算和售后](https://afdian.com/term)
- [创作者费用与结算](https://guide.afdian.com/faq/faq-for-creators)
- [数字商品与自动随机发放激活码](https://guide.afdian.com/creator/creator-level-up)
- [开发者 API 和 Webhook](https://guide.afdian.com/creator/developer)
- [OAuth2 关联授权](https://guide.afdian.com/creator/oauth2)

### 微信支付、支付宝与工商登记

- [微信支付小微商户产品介绍与行业限制](https://pay.wechatpay.cn/doc/v3/partner/4012165168)
- [微信支付小微商户申请资料](https://pay.wechatpay.cn/doc/v3/partner/4012165177)
- [微信支付小微商户服务商进件](https://pay.wechatpay.cn/doc/v3/partner/4012722249)
- [微信支付普通商户 Native 准入主体](https://pay.wechatpay.cn/doc/v3/merchant/4012791874)
- [支付宝开放平台个人商户注册路径](https://open.alipay.com/platform/accessProcessPage.htm)
- [支付宝当面付个人商户/门店材料说明](https://render.alipay.com/p/c/zhifuisv/3.html)
- [国家市场监管总局《个体工商户登记管理规定》](https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/fgs/art/2025/art_521d2635c33c4a439f638905ed92056c.html)

