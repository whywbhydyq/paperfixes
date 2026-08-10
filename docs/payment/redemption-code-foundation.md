# 一次性套餐兑换码基础

本功能为爱发电等外部数字商品平台提供平台无关的发码基础，不依赖任何支付回调，也不新增 Vercel Function。

## 安全和结算约束

- 兑换码由服务端使用加密安全随机数生成，格式为 `PF-XXXXX-XXXXX-XXXXX-XXXXX`，约 100 bit 熵。
- 数据库只保存规范化兑换码的 SHA-256 摘要和末四位提示，不保存明文兑换码。
- 明文只在管理员创建批次的响应中返回一次，之后无法从数据库恢复。
- 领取兑换码、更新用户套餐、增加额度和写入 `Topup` 审计记录在同一个数据库事务内完成。
- 同一用户重复提交同一码返回幂等成功，不会重复增加额度；其他用户不能复用。
- 有效套餐从当前到期日继续叠加 30 天；已过期套餐先清除旧额度，再应用新套餐。
- 在线订单和兑换码共同调用 `applyPlanCredit`，结算规则只有一份。

## 管理员生成批次

复用现有管理员函数：

```http
POST /api/admin?resource=redemption-codes
Content-Type: application/json

{
  "planKey": "basic",
  "quantity": 20,
  "source": "afdian",
  "note": "爱发电基础套餐 2026-08 批次",
  "expiresAt": "2027-08-10T00:00:00.000Z"
}
```

`quota` 和 `price` 必须来自服务器当前启用的套餐配置，客户端传入的同名字段会被忽略。单批最多生成 100 个码。应立即下载/复制响应中的 `codes` 并安全导入发码平台。

管理员可用以下接口查看最近 100 条非秘密元数据，响应不会返回摘要或明文：

```http
GET /api/admin?resource=redemption-codes
```

## 用户兑换

登录用户在个人中心的“套餐兑换码”页签提交，调用现有用户函数：

```http
POST /api/user?action=redeem
Content-Type: application/json

{ "code": "PF-XXXXX-XXXXX-XXXXX-XXXXX" }
```

## 上线前置条件

代码合并后仍需单独审阅并执行 `20260810000000_add_redemption_codes` 数据库迁移。当前实现不会自行运行迁移，也不会接触线上或 Preview 数据库。
