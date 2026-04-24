readme = """# PaperFix - 学术改写引擎

> 智能降低 AIGC 检测率 · 技术术语零破坏 · 字数严格控制

## 项目概述

面向高校学生的学术文本改写 SaaS 平台。用户粘贴论文段落，系统调用 AI 引擎改写，降低 AIGC 检测率，同时保持技术术语不变、字数控制在 ±5% 以内。

### 核心功能

| 功能 | 说明 |
|------|------|
| 学术改写 | OpenRouter API（Gemini 3 Flash）驱动，自研 Prompt 引擎 |
| 手机号登录 | 阿里云短信验证码 / 开发模式本地验证码 |
| 邮箱登录 | 邮箱+密码注册登录 |
| 套餐付费 | 易支付（支付宝/微信），4 档定价 |
| 用户中心 | 改写历史、充值记录、修改密码 |
| 管理后台 | 用户管理、套餐配置、手动充值 |

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite 7 + Tailwind CSS 4 |
| 状态管理 | Zustand（persist 持久化到 localStorage） |
| 路由 | React Router DOM v7 |
| 图标 | Lucide React |
| 后端 | Vercel Serverless Functions（Node.js） |
| 数据库 | PostgreSQL（Prisma ORM） |
| AI | OpenRouter API → Google Gemini 3 Flash Preview |
| 支付 | 易支付（码支付平台）- 支付宝/微信 |
| 短信 | 阿里云号码认证服务（SendSmsVerifyCode / CheckSmsVerifyCode） |
| 认证 | JWT（bcryptjs 哈希密码，30天过期） |

---

## 项目结构
├── src/ # 前端 React
│ ├── App.tsx # 路由定义：/ /home /pricing /dashboard /admin
│ ├── main.tsx # 入口
│ ├── index.css # Tailwind + 自定义动画
│ ├── pages/
│ │ ├── ReducePage.tsx # 核心：改写页面（输入→处理→结果）
│ │ ├── HomePage.tsx # 落地页/营销页
│ │ ├── PricingPage.tsx # 定价页（套餐从 /api/admin?resource=config 读取）
│ │ ├── DashboardPage.tsx # 用户中心（历史/充值/改密码 三个 Tab）
│ │ └── AdminPage.tsx # 管理后台
│ ├── components/
│ │ ├── Navbar.tsx # 导航栏（登录态/未登录态/移动端）
│ │ ├── Footer.tsx # 页脚
│ │ ├── LoginModal.tsx # 登录/注册弹窗（手机号 Tab / 邮箱 Tab）
│ │ ├── PaymentModal.tsx # 支付方式选择弹窗（支付宝/微信）
│ │ └── JobPoller.tsx # 轮询组件（每2秒查状态，最长5分钟超时）
│ ├── store/
│ │ └── useAuthStore.ts # Zustand store：user/token/loginJob/inputText
│ ├── lib/
│ │ └── api.ts # API 客户端（所有后端请求统一封装）
│ └── utils/
│ └── cn.ts # clsx + tailwind-merge 工具
│
├── api/ # Vercel Serverless Functions
│ ├── _lib/
│ │ ├── ai.ts # AI 引擎（OpenRouter API / Mock 模式）
│ │ ├── auth.ts # JWT 签发/验证 + bcrypt 密码哈希
│ │ ├── constants.ts # 管理员判定逻辑
│ │ └── prisma.ts # Prisma Client 单例
│ ├── auth/
│ │ ├── login.ts # POST 邮箱密码登录
│ │ ├── register.ts # POST 邮箱注册
│ │ ├── sms.ts # POST 发送验证码 / 验证登录（阿里云或本地）
│ │ ├── wechat/
│ │ │ └── qrcode.ts # 微信扫码登录（预留）
│ │ └── wechat-poll/
│ │ └── [scene].ts # 微信扫码轮询（预留）
│ ├── rewrite/
│ │ ├── submit.ts # POST 提交改写任务（扣额度→创建Job→返回jobId）
│ │ └── status/
│ │ └── [jobId].ts # GET 轮询任务状态（PENDING时触发AI处理）
│ ├── payment/
│ │ ├── create.ts # POST 创建支付订单 / GET 查询订单状态
│ │ └── notify.ts # GET/POST 易支付异步回调（验签→充值）
│ ├── user/
│ │ └── index.ts # GET quota/jobs/topups + POST 改密码
│ └── admin/
│ └── index.ts # GET/PUT config/users + POST 手动充值
│
├── prisma/
│ └── schema.prisma # 数据模型：User/Job/Topup/Config/SmsCode/Order
├── vercel.json # 路由重写 + CORS 头
├── vite.config.ts # Vite 配置 + 开发代理 /api→线上
├── tsconfig.json
├── package.json
├── index.html
└── .env # 环境变量（不提交 Git）

text


---

## 数据模型
User
├── id UUID 主键
├── email String? 唯一，邮箱登录用
├── phone String? 唯一，手机号登录用
├── passwordHash String? bcrypt 哈希
├── wechatOpenId String? 微信登录预留
├── wechatName String? 微信昵称预留
├── role String "user" | "admin"
├── plan String "free" | "emergency" | "basic" | "pro"
├── quota Int 剩余额度
├── totalUsed Int 累计使用次数
└── createdAt DateTime

Job
├── id UUID 主键
├── userId String → User.id
├── inputText String 原文
├── outputText String? 改写结果
├── status String "PENDING" | "PROCESSING" | "DONE" | "FAILED"
├── inputLen Int? 原文字数
├── outputLen Int? 结果字数
├── error String? 失败原因
├── createdAt DateTime
└── doneAt DateTime?

Order（支付订单）
├── id String 主键（order_时间戳_随机串）
├── userId String → User.id
├── planKey String 套餐标识
├── amount Float 金额（元）
├── quota Int 购买额度数
├── status String "PENDING" | "PAID"
├── paidAt DateTime?
└── createdAt DateTime

Topup（充值记录）
├── id UUID
├── userId String → User.id
├── amount Int 增加额度数
├── price Float 实付金额
├── planKey String
├── note String?
└── createdAt DateTime

Config（系统配置）
├── key String 主键（如 "pricing_plans"）
└── value String JSON 字符串

SmsCode（验证码）
├── id UUID
├── phone String
├── code String 阿里云模式存 "ALIYUN"
├── used Boolean
├── expiresAt DateTime
└── createdAt DateTime

text


---

## 核心流程

### 改写流程
用户粘贴文本 → 前端校验字数（min~max 由套餐决定）
POST /api/rewrite/submit { text }
→ 扣额度（quota -1, totalUsed +1）原子事务
→ 创建 Job（status=PENDING）
→ 返回 { jobId, quota }
前端 JobPoller 每2秒 GET /api/rewrite/status/{jobId}
后端首次检测到 PENDING：
→ 原子更新为 PROCESSING（防并发）
→ 调用 callRewriteAI()（OpenRouter API 或 Mock）
→ 成功：更新 Job 为 DONE + outputText
→ 失败：退还额度 + 更新 Job 为 FAILED
前端收到 DONE → 显示结果
超时5分钟 → 自动退还额度
text


### 支付流程
用户选套餐 → PaymentModal 选支付方式
POST /api/payment/create { planKey, payType }
→ 查套餐价格（数据库配置 > 兜底价格）
→ 创建 Order（status=PENDING）
→ MD5 签名拼接 URL
→ 返回 { payUrl } → 前端跳转
易支付平台展示固定金额支付页
用户扫码付款
易支付回调 GET/POST /api/payment/notify
→ MD5 验签
→ 校验金额
→ 事务：Order→PAID + User.quota+=N + 创建Topup
→ 返回 "success"
用户跳转回 /dashboard，额度已到账
text


### 登录流程
手机号：

POST /api/auth/sms { action:"send", phone }
→ 阿里云发送验证码 / 开发模式返回 devCode
POST /api/auth/sms { action:"verify", phone, code }
→ 阿里云核验 / 本地核验
→ 查找或创建用户（新用户额度从配置读取）
→ 签发 JWT
→ 返回 { user, token }
邮箱：

POST /api/auth/register { email, password } → 注册
POST /api/auth/login { email, password } → 登录
→ bcrypt 验证 → 签发 JWT → 返回 { user, token }
text


---

## 环境变量

```env
# 数据库
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT（生产环境必须换）
JWT_SECRET=your-random-secret-string

# AI 改写（留空则用 Mock 模式）
OPENROUTER_API_KEY=sk-or-xxx
OPENROUTER_MODEL=google/gemini-3-flash-preview
SITE_URL=https://your-domain.vercel.app

# 前端 API 地址（本地开发和 Vercel 部署都留空）
VITE_API_BASE=

# 易支付
EPAY_PID=11177
EPAY_KEY=your-epay-key
EPAY_API=https://pay.mzfpay.com/xpay/epay

# 阿里云短信（留空则用开发模式-验证码返回在前端）
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_SMS_SIGN_NAME=
ALIYUN_SMS_TEMPLATE_CODE=
本地开发
Bash

# 安装依赖
npm install

# 数据库迁移
npx prisma db push

# 启动开发服务器（前端 :5173，API 代理到线上）
npm run dev
前端开发时，vite.config.ts 配置了 /api 代理到线上 Vercel 地址，所以本地不需要跑后端。

如果要本地测试后端，需要 vercel dev + 本地 PostgreSQL。

部署
Bash

# Vercel 一键部署
git push origin main

# 环境变量在 Vercel Dashboard → Settings → Environment Variables 配置
# 部署后自动执行 prisma generate（见 package.json postinstall）
# 首次部署后需手动 npx prisma db push 创建表
套餐配置
套餐数据存储在 Config 表（key=pricing_plans），首次访问 /api/admin?resource=config 时自动初始化默认值。

默认套餐：

planKey    名称    价格    额度    单次上限
free    免费体验    ¥0    2次    500字
emergency    急救包    ¥9.9    5次    2000字
basic    毕业包    ¥49    30次    3000字
pro    全包通行    ¥99    100次    5000字
管理员可通过 PUT /api/admin?resource=config 修改套餐。

AI Prompt 策略
核心 Prompt 位于 api/_lib/ai.ts 的 REWRITE_PROMPT，执行以下改写策略：

增加冗余与解释性 - 动词短语扩展（"管理"→"开展管理工作"）
系统性词汇替换 - "采用"→"运用"、"基于"→"鉴于"、"通过"→"借助"
括号内容处理 - 括号内信息用"即/也就是/比如"融入句子
句式微调 - "将"→"把"字句、"若…则"→"如果…就"
技术术语保护 - Django/MySQL/JWT/代码路径等绝对不修改
字数控制 - 输出不超过原文
API 路由一览
方法    路径    说明    认证
POST    /api/auth/login    邮箱登录    ❌
POST    /api/auth/register    邮箱注册    ❌
POST    /api/auth/sms    发送/验证短信码    ❌
POST    /api/rewrite/submit    提交改写    ✅
GET    /api/rewrite/status/{jobId}    轮询状态    ✅
POST    /api/payment/create    创建支付    ✅
GET    /api/payment/create?orderId=    查询订单    ✅
GET/POST    /api/payment/notify    支付回调    ❌
GET    /api/user?action=quota    查额度    ✅
GET    /api/user?action=jobs    改写历史    ✅
GET    /api/user?action=topups    充值记录    ✅
POST    /api/user?action=password    改密码    ✅
GET    /api/admin?resource=config    获取套餐    ❌
PUT    /api/admin?resource=config    改套餐    🔒管理员
GET    /api/admin?resource=users    用户列表    🔒管理员
PUT    /api/admin?resource=users    编辑用户    🔒管理员
POST    /api/admin?resource=topup    手动充值    🔒管理员
前端状态管理
useAuthStore（Zustand + persist）：

text

user: User | null          # 当前用户信息
token: string | null       # JWT token
isLoggedIn: boolean        # 登录态
showLoginModal: boolean    # 控制登录弹窗
activeJob: ActiveJob       # 恢复中断的改写任务
inputText: string          # 持久化输入框文本
持久化到 localStorage（key=aigc-auth-storage），刷新页面不丢失。

注意事项
Vercel 免费版函数超时 60 秒，复杂文本可能超时 → 改写失败自动退还额度
OpenRouter API Key 留空时自动降级为 Mock 模式（简单词汇替换）
阿里云短信 Key 留空时自动降级为开发模式（验证码返回到前端）
新用户注册额度从数据库配置读取，非硬编码
支付签名使用 MD5，PID 和 KEY 必须与易支付平台一致
管理员判定：role="admin" 或 email 在白名单中
"""
with open('README.md', 'w', encoding='utf-8') as f:
f.write(readme)

print(f'✅ README.md 已生成 ({len(readme)/1024:.1f} KB)')

import os
os.remove('gen_readme.py') if os.path.exists('gen_readme.py') else None
