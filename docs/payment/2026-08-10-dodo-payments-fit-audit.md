# PaperFix × Dodo Payments 适配审计（中国个人主体）

**审计日期：** 2026-08-10

**审计范围：** 只读核查 Dodo Payments 官方资料，并给出开户、产品与后续集成边界；本文件不代表已获准入，不包含任何生产密钥，也不实施支付代码、数据库迁移或部署。

**当前主体与商品：** 中国大陆个人、无注册公司；PaperFix 销售一次性固定改写额度包，非订阅；希望中国客户以微信支付/CNY 付款。

## 1. 结论

**结论：Dodo Payments 在功能和主体资格上“原则上适配”，但 PaperFix 当前只能列为有条件候选，现阶段仍是 No-Go。**

Dodo 官方资料同时支持以下判断：

- 官方允许未注册企业以 **Individual** 入驻；中国在可接受商户及提现国家/地区名单中。
- 官方支持固定价格的 **Single Payment** 产品，也支持一次性产品附加自定义服务额度。
- 微信支付支持一次性 USD/CNY 交易，不支持订阅；客户可用 CNY 付款，但商户按官方微信页说明以 USD 结算。
- Dodo 欢迎 SaaS 与 AI 产品，但 AI 文本生成/处理工具通常需要额外审核；任何作弊功能、误导性承诺、网站与申报不一致或高退款/拒付都可能导致拒绝、暂停或清退。

因此，只有同时满足下列条件才可进入生产集成：

1. Dodo 合规团队书面确认了解 PaperFix 的**真实功能和学术场景**后，愿意继续审核；
2. Individual 的产品信息、KYC 和银行验证在控制面板全部通过；
3. Dodo 在该 Live 账户实际开放微信支付，并确认 CNY 展示/计价方式与中国个人的 USD 提现路径；
4. PaperFix 官网、产品页、条款、退款政策和实际能力与申报完全一致，不再用“规避检测”“保证通过”等方式销售；
5. 支付成功、重复通知、退款、争议与额度撤销的服务端账本方案通过测试。

**任何客服预沟通、测试模式可用或本文结论，都不等于最终审批。** Dodo 明确说明额外审核不保证通过，准入后也可能持续监控和调整权限。

> **爱发电结论：明确不适配，已排除且不再推荐。** PaperFix 是一次性固定额度包，不应把它包装成爱发电的订阅、会员或持续赞助商品。后续支付方案、开发计划和运营文案中均不得再把爱发电列为主方案或备用方案。

## 2. 官方适配矩阵

| 核查项 | 官方能力/政策 | PaperFix 适配结论 | 风险级别 |
| --- | --- | --- | --- |
| 中国个人、无公司 | FAQ 明确允许未注册企业按 Individual 入驻；个人流程为产品信息表 → KYC → 银行验证。中国在可接受国家列表中，资格以政府证件签发国为准 | **原则上符合**。应使用中国政府签发的本人证件，不能虚构公司或借用不匹配的第三方收款账户 | 高 |
| 商户接受政策 | SaaS 与 AI 产品属于欢迎类别；AI 内容生成工具通常需要额外审核；作弊、误导、网站不一致及声誉风险会导致拒绝或清退 | **有条件**。学术文本工具不是当前政策中的明示禁止类，但学术诚信与“规避检测”风险很高，必须主动披露并预审 | 严重 |
| 自动化交付 | 禁止以人工劳动为主要价值的 Manual Digital Services；固定、标准化、同样交付的 productised service 可能审核通过 | **符合自动化方向**。必须如实申报为用户提交文本后自动处理，不得伪装人工导师、代写或咨询服务 | 高 |
| 一次性付款 | 官方 One-Time Payments 支持固定前置收费、无续费，并可经托管结账、付款链接或 API 销售 | **符合**。Basic/Pro 应创建 Single Payment 产品，不创建 Subscription | 低 |
| 固定额度包 | Credit-Based Billing 支持 Custom Unit、一次性发放、到期时间和额度 Webhook | **功能上符合**。但 PaperFix 已有内部额度账本，第一阶段不应同时建立两个权威账本 | 中 |
| 微信支付 | WeChat Pay 对全球客户支持 USD/CNY，一次性支付，最低 $0.50/¥1，不支持订阅 | **符合目标付款方式**，但只有账户验证并进入 Live 后才自动可用，且仍需在真实账户确认 | 高 |
| CNY 与提现 | 微信页写明客户可用 USD/CNY 支付、商户以 USD 结算；官方提现钱包为 USD/GBP/EUR，跨境换汇和中间行费用可能发生 | **CNY 是客户支付币种，不是 CNY 提现承诺**。需确认 ¥29/¥99 是否能精确定价，及中国个人银行/Payoneer 的实际 USD 入账路径 | 高 |
| Webhook | 官方要求 HMAC SHA256 签名校验、HTTPS、`webhook-id` 幂等；事件可重复、乱序，非 2xx 会重试 | **必须实现后才可上线**。返回页参数不能作为到账依据 | 严重 |
| 退款 | 成功付款可在 30 天内发起全额或部分退款，退回原支付方式；有 succeeded/pending/review/failed 状态及退款事件 | **必须补齐公开政策和内部撤销账本**。退款申请提交不等于退款成功，不能先行按返回页或人工截图改额度 | 严重 |

## 3. PaperFix 产品描述与合规边界

### 3.1 可提交给 Dodo 的真实描述

**中文一段式描述：**

> PaperFix 是自动化中文学术与技术文本表达优化 SaaS，对用户自行提供的文本进行句式重构、清晰度优化、术语保护和字数控制。它不代写论文，不生成研究、数据或引用，不承诺任何检测结果，也不帮助用户规避学校或机构的审查；输出必须由作者复核并按所在学校、期刊或机构规则使用。

**English description：**

> PaperFix is an automated SaaS for editing user-provided Chinese academic and technical text for clarity, sentence structure, terminology preservation, and length control. It does not ghostwrite papers, generate research, data, or citations, guarantee detector outcomes, or help users evade institutional checks. Users must review the output and follow their institution's rules.

产品信息表可选择/填写：

- Category：`SaaS / AI product`（按控制面板实际可选项选择最接近者）；
- Delivery：登录后的自动化网页服务，经签名 Webhook 确认付款成功后自动增加非现金、不可转让的服务使用次数；
- Automation：fully automated；
- Integration：Checkout Sessions API + signed webhooks；
- Pricing：one-time fixed-price credit packs，no automatic renewal；
- Sensitive/compliance disclosure：academic/technical text editing、AI-assisted output、institutional academic-integrity restrictions。

### 3.2 不能使用的包装

- 不得称为论文代写、作业代做、研究设计或人工导师服务；
- 不得承诺“必过检测”“保证降低到某个比例”“规避 AIGC/查重/学校审查”；
- 不得暗示会生成或伪造研究数据、实验结果、引用、文献或作者原创判断；
- 不得在 Dodo 申报“通用写作工具”，而官网、SEO 页面或实际功能继续重点宣传规避检测；
- 不得为绕过审核而错误选择商品类别、隐藏学术用途或只临时更换结账页文案。

### 3.3 当前上线前阻断项

当前代码和站点仍大量出现“AI论文降重”“降低 AIGC 检测率”“论文 AI 率优化”“免费降 AI 率额度”等表达。即使部分页面已有“不保证检测通过”和学术诚信说明，这组销售重点仍可能被合规团队理解为检测规避或作弊工具。

在提交产品信息表之前，应由产品/内容负责人完成全站一致性清查，至少覆盖首页、导航、SEO 元数据、定价、博客标题与正文、FAQ、服务条款、产品内提示和 Dodo 商品描述。清查目标不是换一个名称掩盖功能，而是确保**真实能力、用途限制、营销承诺和用户实际体验一致**。Dodo 官方要求产品验证表内容准确匹配一个公开、可访问的网站。

## 4. 实际开户清单

### 4.1 申请前准备

- [ ] 使用实际运营者本人邮箱、手机号和法定姓名；确认年满开户要求或按官方未成年人规则由真实监护人经营
- [ ] 准备中国签发、有效、清晰的实体政府身份证件，以及可完成实时自拍/活体的摄像设备
- [ ] 准备与 KYC 姓名完全一致的个人银行账户；如拟使用 Payoneer，先确认其账户已批准并可接收 USD
- [ ] 向 `support@dodopayments.com` 书面确认中国个人的提现路由、发送币种、银行所需字段和预期费用，再关联银行
- [ ] 公开网站可无需登录查看产品用途、功能、示例、价格、交付方式、客服邮箱、服务条款、隐私政策和退款政策
- [ ] 付费页明确 Basic/Pro 都是单次购买、无自动续费、额度和有效期确定；在线支付未获准前保持关闭
- [ ] 退款政策写清申请入口、时限、已使用/未使用额度处理、部分退款算法、到账方式及争议联系渠道，并与 Dodo 30 天退款能力和适用消费者规则协调
- [ ] 准备可供合规团队检查的演示账号或录屏，展示“用户自带文本 → 自动表达优化 → 用户人工复核”的完整流程
- [ ] 准备真实获客渠道与社会账号；若代表实际运营者，可提供 GitHub `whyybhydyq` 等可核验资料，不创建虚假背书

### 4.2 先做书面预审

在填写正式产品信息表前，把以下内容发送给 `compliance@dodopayments.com`：

1. PaperFix 生产 URL、定价页、条款、隐私、退款和联系页；
2. 上述中英文真实描述、功能截图/录屏和完整禁用场景；
3. 明确说明输入由用户提供、输出自动生成、无人工代写、无研究/数据/引用生成、无检测结果承诺；
4. Basic/Pro 是 CNY 一次性服务使用次数包，30 天有效且不续费，额度无现金价值、不可转让或提现；
5. 请求书面回答：该产品是否可继续申请；中国 Individual 是否可用；该账户能否开通 WeChat Pay/CNY；CNY 是直接商品计价还是 Adaptive Currency；中国个人 USD 提现应使用何种银行路径；已部分消费额度的退款如何处理。

预审回复只用于降低误判风险，**不替代产品验证、KYC、银行验证或后续持续监控，也不保证最终通过。**

### 4.3 控制面板开户顺序

- [ ] 注册 Dodo Payments，账户类型选择 **Individual**，不要选择 Organization
- [ ] Product Information Form 如实提交网站、描述、类别、交付方式、自动化程度、敏感领域、集成方式、产品阶段、获客方式和社会账号
- [ ] KYC 上传本人实体证件并完成自拍活体；证件签发国选择 China
- [ ] Bank Verification 填写同名个人账户，不能使用姓名不匹配或第三方账户
- [ ] 处理所有 on-hold/补件要求；只在理解拒绝原因并修正后申诉，官方说明申诉机会只有一次且决定为最终结果
- [ ] 控制面板显示产品、KYC 和银行验证均通过后，再验证 Live API key、Live webhook 和 Live payment methods
- [ ] 在关联银行前再次向支持确认中国路线；官方默认每月两次提现、总钱包最低阈值等值 $50，跨境换汇/中间行费用另计

## 5. 三档当前产品映射

以下映射以仓库当前默认套餐为准。免费档是站内获客权益，不创建 Dodo 收费商品；两个付费档各对应一个 Dodo Single Payment 产品。

| PaperFix planKey | 面向客户的商品名 | 价格与权益 | Dodo 映射 | Dodo 产品 ID 配置 |
| --- | --- | --- | --- | --- |
| `free` | PaperFix 免费体验 | ¥0；注册赠送 3 次；单次最多 500 字 | **不创建 Dodo 产品、不进入结账**；由 PaperFix 注册流程发放 | 无 |
| `basic` | PaperFix 基础表达优化额度包 | 目标价 ¥29 CNY；一次性 50 次；单次最多 3000 字；30 天有效；不自动续费 | Single Payment；固定数量 1；商品描述注明 50 次自动文本表达优化服务使用次数 | `DODO_PAYMENTS_PRODUCT_ID_BASIC` |
| `pro` | PaperFix 专业表达优化额度包 | 目标价 ¥99 CNY；一次性 300 次；单次最多 5000 字；30 天有效；不自动续费 | Single Payment；固定数量 1；商品描述注明 300 次自动文本表达优化服务使用次数 | `DODO_PAYMENTS_PRODUCT_ID_PRO` |

产品配置约束：

- 生产前在真实账户确认产品能以**精确 CNY 金额**结账；若 CNY 只能通过 Adaptive Currency 产生，汇率或附加费会使结账金额偏离 ¥29/¥99，必须先决定由客户承担还是商户吸收并更新展示。
- Checkout 只允许服务端白名单中的外部 product ID，数量固定为 1；客户端不能提交金额、币种、额度或任意 product ID。
- Product name、description、image、tax category、品牌和价格均在 Dodo 建立；产品说明必须写明付款确认后自动交付、次数、单次字数、30 天有效、无续费和人工复核要求。
- 当前有效期规则是“有效期内再次购买，在现有到期日后叠加 30 天”。该规则与每笔独立信用 grant 的到期语义未必相同，必须由 PaperFix 内部账本继续执行并专项测试。

## 6. Credits 方案选择

Dodo 原生 Credit-Based Billing 从能力上支持此模式：可为一次性产品附加 Custom Unit credits，在购买时一次发放，设置 30 天到期，并通过 `credit.*` Webhook 和 ledger 跟踪。

但 PaperFix 已有额度、有效期叠加、任务失败返还和充值记录逻辑。首期建议：

1. **Dodo 只作为 MoR、商品目录、结账和退款来源；PaperFix 内部账本是唯一服务额度权威。**
2. 仅在经签名验证的 `payment.succeeded` 事件中，按外部 product ID 固定映射为 `basic=50` 或 `pro=300`，原子结算一次。
3. 使用 metadata 携带不可伪造的内部订单引用；不能把手机号、用户输入文本或其他敏感内容放入 metadata。
4. PaperFix credits 定义为“成功提交一次自动表达优化任务的服务使用次数”，不是法币、储值、电子钱包、可转让资产或可提现余额。
5. 不启用 Dodo Fiat Credits、overage、auto top-up 或订阅续发；Dodo 商户政策不支持储值/资金管理类产品。

若未来迁移到 Dodo 原生 credits，应另立迁移项目：使用 Custom Unit、precision 0、30-day expiry、无 rollover、无 overage，并验证多次购买的到期叠加、失败返还、退款撤销、历史账本导入、对账及回滚。迁移完成前不得让 Dodo ledger 和 PaperFix ledger 同时作为余额判定来源。

## 7. Checkout、Webhook 与到账要求

### 7.1 Checkout

- 创建 Checkout Session 时只传服务端确认过的产品 ID，`quantity=1`；
- 微信方法使用官方当前文档枚举 `we_chat_pay`，同时保留 `credit`、`debit` 备用；实现时以当时 SDK schema 为准；
- customer/metadata 必须绑定已登录 PaperFix 用户和内部订单，避免只按邮箱、昵称或返回 URL 入账；
- `return_url` 只用于显示“支付处理中/等待确认”，**不能据其 `status=succeeded` 参数发放额度**；
- Test 和 Live 的 API key、产品及 Webhook 相互独立，测试完成后仍需核对 Live 产品 ID。

### 7.2 Webhook 最低安全门槛

- HTTPS 接收原始请求体；使用官方 SDK `unwrap()` 或 Standard Webhooks 规则校验 `webhook-signature`、`webhook-timestamp` 和 `webhook-id`；不得使用 `unsafe_unwrap()` 处理生产入账；
- 使用 `webhook-id` 建立持久化唯一约束；Dodo 会重试，且事件可能乱序，不能用进程内 Set 作为生产幂等方案；
- 校验 `business_id`、payment ID、支付最终状态、外部 product ID/line items、数量、币种、实收金额、内部 order reference 和用户绑定；任一不一致进入人工复核，不发额度；
- 在持久化事件和完成/安排可靠处理后返回 2xx；非 2xx 会触发重试。Vercel 无持久保障的 response-after-return 异步任务不能作为唯一处理链路；
- `payment.succeeded` 才能结算；`payment.processing`、`payment.failed`、`payment.cancelled` 只更新订单状态；
- 订阅事件不应为本方案入账，因为 Basic/Pro 必须是 Single Payment；意外出现订阅产品或续费事件应报警并停止自动结算；
- 定期用支付查询 API 对账，处理“Dodo 成功但本站未到账”以及重复/延迟通知。

建议订阅的事件至少包括：

| 事件 | PaperFix 动作 |
| --- | --- |
| `payment.succeeded` | 完成全量校验后幂等增加固定额度和 30 天有效期 |
| `payment.processing` / `payment.failed` / `payment.cancelled` | 更新状态，不发额度 |
| `refund.succeeded` | 原子记录退款并按公开政策撤销尚未消费权益/记录差额 |
| `refund.failed` | 标记失败并转客服处理，不先行撤销或重复退款 |
| `dispute.opened` 及后续 dispute 事件 | 冻结自动补发，保存交付、使用日志和条款接受证据，进入人工处理 |

## 8. 退款与争议要求

Dodo 官方退款规则是：原付款必须成功；全额或部分退款需在交易日起 30 天内发起；退回原支付方式；退款可能处于 `pending`、`review`、`succeeded` 或 `failed`。成功后 Dodo 会发送退款收据。其 FAQ 同时说明，“不退款”条款不能覆盖银行卡网络的拒付流程。

PaperFix 上线前必须补齐：

- 独立、公开且可在结账前访问的退款政策，而不是仅写“以平台实际记录为准”；
- 支持邮箱、订单定位、申请时限、预计处理时间、原路退回说明；
- 未使用额度全额退款、已部分使用时是否部分退款及其计算方式；具体规则需结合适用消费者规则确认后公开，不在代码中临时决定；
- 以 `refund.succeeded` 为财务与权益变更依据；申请创建、成功返回页或客服口头确认均不是最终状态；
- 退款、撤销和补偿使用同一原子账本，避免重复扣减、负额度、已退款仍可继续使用或同一订单重复退；
- 保存必要且最小化的订单、交付、额度消费、失败返还和用户接受条款证据，以处理退款、拒付和审计；不得为举证无限期保存用户论文原文。

## 9. 后续 Vercel 环境变量名称

以下仅是后续实现约定的**变量名**，本文件不写入值或秘密。相同名称应在 Vercel Preview 与 Production 分别配置对应 Test/Live 值，不创建带密钥值的文档或前端 `VITE_*` 变量。

```text
DODO_PAYMENTS_API_KEY
DODO_PAYMENTS_WEBHOOK_KEY
DODO_PAYMENTS_ENVIRONMENT
DODO_PAYMENTS_BUSINESS_ID
DODO_PAYMENTS_RETURN_URL
DODO_PAYMENTS_CANCEL_URL
DODO_PAYMENTS_PRODUCT_ID_BASIC
DODO_PAYMENTS_PRODUCT_ID_PRO
```

其中 `DODO_PAYMENTS_API_KEY`、`DODO_PAYMENTS_WEBHOOK_KEY`、`DODO_PAYMENTS_ENVIRONMENT` 和 `DODO_PAYMENTS_RETURN_URL` 与官方 SDK/适配器文档命名一致；其余是 PaperFix 建议的服务端配置约定。免费档不创建 `PRODUCT_ID_FREE`。

## 10. Go / No-Go 门槛

**当前状态：No-Go，继续保持线上支付关闭。**

只有以下证据齐全才可转 Go：

- [ ] Dodo 合规团队已收到完整真实描述并书面允许继续申请
- [ ] 官网不再以检测规避或结果承诺销售，且申报、网站和实际能力一致
- [ ] Individual 产品信息、KYC、银行验证全部通过
- [ ] Live 账户实际显示 WeChat Pay；CNY 价格、费用承担和 USD 提现路径均已确认
- [ ] Basic/Pro Live product IDs 已建立并与服务端固定映射一致
- [ ] 签名、幂等、乱序、重复、延迟、金额不符、产品不符及对账测试通过
- [ ] 退款政策公开，`refund.succeeded` 与 dispute 全流程及额度撤销测试通过
- [ ] Test 与 Live 配置隔离，生产秘密只存在 Vercel 服务端环境

任一项缺失都不应恢复付费按钮。若 Dodo 拒绝产品、微信/CNY 或中国个人提现路径，则不绕过审核、不误报类目、不借他人主体；保持在线支付关闭并改为评估合规主体方案。

## 11. 主要风险排序

1. **严重 — 产品定位/网站一致性：** 当前大量“降 AI 率/检测优化”内容与学术场景结合，可能被判作弊、误导或声誉风险；这是最主要准入阻断项。
2. **严重 — 账务一致性：** 未正确签名、幂等、核价或退款撤销会造成免费发放、重复入账和拒付损失。
3. **高 — 审批不确定性：** Individual 与中国在名单内只代表可申请；AI 文本工具仍需个案额外审核，准入和持续可用均无保证。
4. **高 — CNY/提现错配：** 客户 CNY 付款不等于商户 CNY 入账；USD 路由、汇率、银行和中间行费用影响实际收益。
5. **高 — 退款与消费者争议：** 当前站内条款缺少可执行退款规则；高退款/投诉也会触发 Dodo 监控。
6. **中 — 双额度账本：** 同时启用 Dodo credits 与 PaperFix quota 会产生到期、消费和退款漂移，首期应坚持单一权威账本。
7. **中 — 支付体验：** 微信二维码在桌面/平板显示、手机扫码最顺；移动端同屏扫码有摩擦，需保留银行卡备用并做真实设备测试。

## 12. 官方资料

以下页面均于 2026-08-10 核查：

- [Dodo Payments Account Verification](https://docs.dodopayments.com/cn/miscellaneous/verification-process)
- [Dodo Payments FAQs](https://docs.dodopayments.com/miscellaneous/faq)
- [Countries Eligible for Merchant Acceptance](https://docs.dodopayments.com/miscellaneous/accepted-countries-and-territories)
- [Merchant Acceptance Policy](https://docs.dodopayments.com/miscellaneous/merchant-acceptance)
- [One-Time Payments](https://docs.dodopayments.com/features/one-time-payment-products)
- [Credit-Based Billing](https://docs.dodopayments.com/features/credit-based-billing)
- [Payment Methods](https://docs.dodopayments.com/features/payment-methods)
- [WeChat Pay](https://docs.dodopayments.com/cn/features/payment-methods/wechat)
- [Checkout Features](https://docs.dodopayments.com/features/checkout)
- [Metadata Guide](https://docs.dodopayments.com/api-reference/metadata)
- [Webhooks](https://docs.dodopayments.com/developer-resources/webhooks)
- [Webhook Event Guide](https://docs.dodopayments.com/developer-resources/webhooks/intents/webhook-events-guide)
- [Refunds](https://docs.dodopayments.com/features/transactions/refunds)
- [Create Refund API](https://docs.dodopayments.com/api-reference/refunds/post-refunds)
- [Payout Structure](https://docs.dodopayments.com/cn/features/payouts/payout-structure)
- [Test Mode vs Live Mode](https://docs.dodopayments.com/miscellaneous/test-mode-vs-live-mode)
- [TypeScript SDK](https://docs.dodopayments.com/developer-resources/sdks/typescript)

Dodo 的产品、国家、支付方式和合规政策会更新；正式提交和上线当天必须再次核查以上官方页面，并以控制面板实际能力和 Dodo 的书面决定为准。
