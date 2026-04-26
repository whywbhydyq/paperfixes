import os

root = os.path.dirname(os.path.abspath(__file__))

def write_file(rel_path, content):
    abs_path = os.path.join(root, rel_path)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ 写入 {rel_path}")

def safe_replace(filepath, old, new, label=""):
    abs_path = os.path.join(root, filepath)
    try:
        with open(abs_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"⚠️ 文件不存在: {filepath}")
        return False
    if old not in content:
        print(f"⚠️ [{label}] 未找到 in {filepath}")
        return False
    content = content.replace(old, new, 1)
    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✅ [{label}] {filepath}")
    return True

# ═══════════════════════════════════════════════════
# 1. PricingPage - 同窗口支付（不再开新标签）
# ═══════════════════════════════════════════════════
safe_replace('src/pages/PricingPage.tsx',
    "        form.target = '_blank';",
    "        form.target = '_self';",
    '同窗口支付')

# ═══════════════════════════════════════════════════
# 2. api/payment/status.ts - 并发安全（原子更新）
# ═══════════════════════════════════════════════════
write_file('api/payment/status.ts', """import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '未登录' });

  const { orderId } = req.query;
  if (!orderId || typeof orderId !== 'string') {
    return res.status(400).json({ error: '缺少 orderId' });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });

  if (!order) {
    return res.status(200).json({ status: 'NOT_FOUND' });
  }

  if (order.status === 'PAID') {
    return res.status(200).json({ status: 'PAID' });
  }

  // PENDING 且超过10秒：主动查平台
  if (order.status === 'PENDING') {
    const elapsed = Date.now() - new Date(order.createdAt).getTime();
    if (elapsed > 10000) {
      try {
        const pid = process.env.EPAY_PID;
        const key = process.env.EPAY_KEY;
        const base = process.env.EPAY_API;

        if (pid && key && base) {
          const baseUrl = base.replace(/\\/?$/, '/');
          const queryUrl = `${baseUrl}api.php?act=order&pid=${pid}&key=${key}&out_trade_no=${orderId}`;
          const queryRes = await fetch(queryUrl);
          const queryData = await queryRes.json();

          console.log('[状态同步] 平台返回:', JSON.stringify(queryData));

          if (queryData.code === 1 && Number(queryData.status) === 1) {
            // 原子更新：只有 PENDING 才更新，防并发
            const updated = await prisma.order.updateMany({
              where: { id: orderId, status: 'PENDING' },
              data: { status: 'PAID', paidAt: new Date() },
            });

            if (updated.count > 0) {
              await prisma.user.update({
                where: { id: order.userId },
                data: { quota: { increment: order.quota }, plan: order.planKey },
              });
              await prisma.topup.create({
                data: {
                  userId: order.userId,
                  amount: order.quota,
                  price: order.amount,
                  planKey: order.planKey,
                  note: '在线支付(主动查询)' + (queryData.trade_no ? ' ' + queryData.trade_no : ''),
                },
              });
              console.log('[状态同步] ✅ 用户', order.userId, '+', order.quota, '次');
            }
            return res.status(200).json({ status: 'PAID' });
          }
        }
      } catch (err) {
        console.error('[状态同步] 查询平台失败:', err);
      }
    }
  }

  return res.status(200).json({ status: order.status });
}
""")

# ═══════════════════════════════════════════════════
# 3. api/payment/notify.ts - 并发安全
# ═══════════════════════════════════════════════════
write_file('api/payment/notify.ts', """import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'crypto';
import prisma from '../_lib/prisma.js';

function genSign(params: Record<string, string>, key: string): string {
  const str = Object.entries(params)
    .filter(([k, v]) => v !== '' && v !== undefined && v !== null && k !== 'sign' && k !== 'sign_type')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return createHash('md5').update(str + key).digest('hex');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const params: Record<string, string> = {};
  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') params[k] = v;
      else if (Array.isArray(v) && v.length > 0) params[k] = v[0];
    }
  }
  if (req.body && typeof req.body === 'object') {
    for (const [k, v] of Object.entries(req.body as Record<string, unknown>)) {
      if (v != null && !params[k]) params[k] = String(v);
    }
  }

  const { trade_no, out_trade_no, trade_status, sign, money } = params;
  console.log('[回调] order=', out_trade_no, 'status=', trade_status);

  const key = process.env.EPAY_KEY;
  if (!key) return res.status(500).send('config error');
  if (sign !== genSign(params, key)) return res.status(400).send('sign error');
  if (trade_status !== 'TRADE_SUCCESS') return res.send('success');
  if (!out_trade_no) return res.status(400).send('missing order id');

  // 原子更新：只有 PENDING 才处理
  const updated = await prisma.order.updateMany({
    where: { id: out_trade_no, status: 'PENDING' },
    data: { status: 'PAID', paidAt: new Date() },
  });

  if (updated.count > 0) {
    const order = await prisma.order.findUnique({ where: { id: out_trade_no } });
    if (order) {
      await prisma.user.update({
        where: { id: order.userId },
        data: { quota: { increment: order.quota }, plan: order.planKey },
      });
      await prisma.topup.create({
        data: {
          userId: order.userId,
          amount: order.quota,
          price: order.amount,
          planKey: order.planKey,
          note: '在线支付' + (trade_no ? ' ' + trade_no : ''),
        },
      });
      console.log('[回调] ✅ 用户', order.userId, '+', order.quota, '次');
    }
  }

  return res.send('success');
}
""")

# ═══════════════════════════════════════════════════
# 4. api/auth/sms.ts - 重写（DB存验证码 + 返回needsPassword）
# ═══════════════════════════════════════════════════
write_file('api/auth/sms.ts', """import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import jwt from 'jsonwebtoken';

function generateCode(): string {
  return Math.random().toString().slice(2, 8);
}

function isValidPhone(phone: string): boolean {
  return /^1[3-9]\\d{9}$/.test(phone);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, phone, code } = req.body || {};

  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({ error: '请输入正确的手机号' });
  }

  if (action === 'send') {
    // 60秒限频
    const recent = await prisma.smsCode.findFirst({
      where: { phone, createdAt: { gt: new Date(Date.now() - 60000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      return res.status(429).json({ success: false, message: '发送太频繁，请60秒后再试' });
    }

    const newCode = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.smsCode.deleteMany({ where: { phone } });
    await prisma.smsCode.create({ data: { phone, code: newCode, expiresAt } });

    // TODO: 接入真实短信服务商
    console.log('[SMS] ', phone, ' => ', newCode);

    return res.status(200).json({
      success: true,
      message: '验证码已发送',
      devCode: newCode,
    });
  }

  if (action === 'verify') {
    if (!code) return res.status(400).json({ error: '请输入验证码' });

    const smsCode = await prisma.smsCode.findFirst({
      where: { phone, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!smsCode || smsCode.code !== code) {
      return res.status(400).json({ error: '验证码错误或已过期' });
    }

    await prisma.smsCode.delete({ where: { id: smsCode.id } });

    let user = await prisma.user.findFirst({ where: { phone } });

    if (!user) {
      user = await prisma.user.create({
        data: { phone, plan: 'free', quota: 3, totalUsed: 0, role: 'user' },
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });

    return res.status(200).json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        wechatName: user.wechatName,
        role: user.role,
        plan: user.plan,
        quota: user.quota,
        totalUsed: user.totalUsed,
      },
      token,
      needsPassword: !user.password,
    });
  }

  return res.status(400).json({ error: '无效操作' });
}
""")

# ═══════════════════════════════════════════════════
# 5. api/auth/phone-login.ts - 手机号+密码登录
# ═══════════════════════════════════════════════════
write_file('api/auth/phone-login.ts', """import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ error: '请输入手机号和密码' });

  const user = await prisma.user.findFirst({ where: { phone } });
  if (!user) return res.status(400).json({ error: '手机号未注册' });
  if (!user.password) return res.status(400).json({ error: '该账号尚未设置密码，请先用验证码登录' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: '密码错误' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });

  return res.status(200).json({
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      wechatName: user.wechatName,
      role: user.role,
      plan: user.plan,
      quota: user.quota,
      totalUsed: user.totalUsed,
    },
    token,
  });
}
""")

# ═══════════════════════════════════════════════════
# 6. api/auth/set-password.ts - 设置密码（需token）
# ═══════════════════════════════════════════════════
write_file('api/auth/set-password.ts', """import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../_lib/prisma.js';
import bcrypt from 'bcryptjs';
import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = getUserFromRequest(req);
  if (!userId) return res.status(401).json({ error: '未登录' });

  const { password } = req.body || {};
  if (!password || password.length < 6) return res.status(400).json({ error: '密码至少6位' });

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash },
  });

  return res.status(200).json({ success: true });
}
""")

# ═══════════════════════════════════════════════════
# 7. src/lib/api.ts - 添加新接口
# ═══════════════════════════════════════════════════
safe_replace('src/lib/api.ts',
    "export async function verifySmsCode(phone: string, code: string) {\n  return request<{ user: any; token: string }>(\n    '/api/auth/sms',\n    { method: 'POST', body: JSON.stringify({ action: 'verify', phone, code }) }\n  );\n}",
    "export async function verifySmsCode(phone: string, code: string) {\n  return request<{ user: any; token: string; needsPassword?: boolean }>(\n    '/api/auth/sms',\n    { method: 'POST', body: JSON.stringify({ action: 'verify', phone, code }) }\n  );\n}",
    'api.ts verifySmsCode 加 needsPassword')

safe_replace('src/lib/api.ts',
    "export async function fetchTopups(token: string | null): Promise<{ topups: TopupRecord[] }> {",
    "export async function phonePasswordLogin(phone: string, password: string) {\n  return request<{ user: any; token: string }>('/api/auth/phone-login', {\n    method: 'POST',\n    body: JSON.stringify({ phone, password }),\n  });\n}\n\nexport async function setUserPassword(password: string, token: string | null) {\n  return request<{ success: boolean }>('/api/auth/set-password', {\n    method: 'POST',\n    body: JSON.stringify({ password }),\n  }, token);\n}\n\nexport async function fetchTopups(token: string | null): Promise<{ topups: TopupRecord[] }> {",
    'api.ts 添加 phonePasswordLogin + setUserPassword')

# ═══════════════════════════════════════════════════
# 8. src/components/LoginModal.tsx - 完整重写
# ═══════════════════════════════════════════════════
write_file('src/components/LoginModal.tsx', """import { useState, useEffect } from 'react';
import { X, Phone, Lock, Eye, EyeOff, Loader2, MessageSquare, KeyRound } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { sendSmsCode, verifySmsCode, phonePasswordLogin, setUserPassword } from '../lib/api';

type Tab = 'sms' | 'password';

export default function LoginModal() {
  const { showLoginModal, closeLoginModal, login } = useAuthStore();

  const [tab, setTab] = useState<Tab>('sms');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState('');
  const [needSetPwd, setNeedSetPwd] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [tempUser, setTempUser] = useState<any>(null);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  useEffect(() => {
    if (showLoginModal) {
      setTab('sms'); setPhone(''); setCode(''); setPassword('');
      setNewPwd(''); setConfirmPwd(''); setError('');
      setNeedSetPwd(false); setTempToken(null); setTempUser(null);
      setDevCode(''); setCountdown(0);
    }
  }, [showLoginModal]);

  if (!showLoginModal) return null;

  const handleSendCode = async () => {
    setError('');
    if (!/^1[3-9]\\d{9}$/.test(phone)) { setError('请输入正确的手机号'); return; }
    setLoading(true);
    try {
      const data = await sendSmsCode(phone);
      if (data.devCode) setDevCode(data.devCode);
      setCountdown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally { setLoading(false); }
  };

  const handleSmsLogin = async () => {
    setError('');
    if (!code) { setError('请输入验证码'); return; }
    setLoading(true);
    try {
      const data = await verifySmsCode(phone, code);
      if (data.needsPassword) {
        setTempToken(data.token);
        setTempUser(data.user);
        setNeedSetPwd(true);
      } else {
        login(data.user, data.token);
        closeLoginModal();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally { setLoading(false); }
  };

  const handlePwdLogin = async () => {
    setError('');
    if (!password) { setError('请输入密码'); return; }
    setLoading(true);
    try {
      const data = await phonePasswordLogin(phone, password);
      login(data.user, data.token);
      closeLoginModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally { setLoading(false); }
  };

  const handleSetPwd = async () => {
    setError('');
    if (newPwd.length < 6) { setError('密码至少6位'); return; }
    if (newPwd !== confirmPwd) { setError('两次密码不一致'); return; }
    setLoading(true);
    try {
      await setUserPassword(newPwd, tempToken);
      login(tempUser, tempToken);
      closeLoginModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '设置失败');
    } finally { setLoading(false); }
  };

  // ─── 设置密码步骤 ───
  if (needSetPwd) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeLoginModal} />
        <div className="relative z-10 w-full max-w-sm animate-fade-in-up overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="text-base font-semibold text-gray-900">设置登录密码</h3>
            <button onClick={closeLoginModal} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-500">首次登录需设置密码，后续可用密码快速登录</p>
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            <div>
              <label className="mb-1 block text-xs text-gray-500">密码</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  placeholder="至少6位" className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-10 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">确认密码</label>
              <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                placeholder="再次输入密码" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
            </div>
            <button onClick={handleSetPwd} disabled={loading || !newPwd || !confirmPwd}
              className="w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
              {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />设置中...</span> : '确认设置'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 登录主界面 ───
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeLoginModal} />
      <div className="relative z-10 w-full max-w-sm animate-fade-in-up overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">登录 / 注册</h3>
          <button onClick={closeLoginModal} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {/* Tab */}
        <div className="flex border-b border-gray-100">
          <button onClick={() => { setTab('sms'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'sms' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <MessageSquare size={14} /> 验证码登录
          </button>
          <button onClick={() => { setTab('password'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'password' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <KeyRound size={14} /> 密码登录
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          {/* 手机号 */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">手机号</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={11}
                placeholder="请输入手机号"
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
            </div>
          </div>

          {tab === 'sms' ? (
            <>
              {/* 验证码 */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">验证码</label>
                <div className="flex gap-2">
                  <input type="text" value={code} onChange={e => setCode(e.target.value)} maxLength={6}
                    placeholder="请输入验证码"
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                  <button onClick={handleSendCode} disabled={countdown > 0 || !phone || loading}
                    className="shrink-0 rounded-xl bg-primary-50 px-4 text-sm font-medium text-primary-600 hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </button>
                </div>
                {devCode && (
                  <p className="mt-1 text-xs text-amber-600">开发模式验证码：{devCode}</p>
                )}
              </div>
              <button onClick={handleSmsLogin} disabled={loading || !phone || !code}
                className="w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />登录中...</span> : '登录 / 注册'}
              </button>
              <p className="text-center text-xs text-gray-400">新手机号将自动注册</p>
            </>
          ) : (
            <>
              {/* 密码 */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">密码</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-10 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                  <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button onClick={handlePwdLogin} disabled={loading || !phone || !password}
                className="w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />登录中...</span> : '登录'}
              </button>
              <p className="text-center text-xs text-gray-400">未设密码？请使用验证码登录</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
""")

# ═══════════════════════════════════════════════════
# 9. Prisma Schema - 添加 SmsCode 模型
# ═══════════════════════════════════════════════════
schema_path = os.path.join(root, 'prisma', 'schema.prisma')
if os.path.exists(schema_path):
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema = f.read()
    if 'model SmsCode' not in schema:
        with open(schema_path, 'a', encoding='utf-8') as f:
            f.write("""

model SmsCode {
  id        String   @id @default(cuid())
  phone     String
  code      String
  expiresAt DateTime
  createdAt DateTime @default(now())
}
""")
        print("✅ prisma/schema.prisma 添加 SmsCode 模型")
    else:
        print("⚠️ SmsCode 模型已存在")
else:
    print("⚠️ prisma/schema.prisma 不存在")

print("\n✅ 全部文件写入完成")
