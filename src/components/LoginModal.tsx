import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mail, Phone, QrCode, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import {
  loginWithEmail, registerWithEmail,
  sendSmsCode, verifySmsCode,
  getWechatQR, pollWechatScan,
} from '../lib/api';

type Tab = 'phone' | 'email' | 'wechat';
type Mode = 'login' | 'register';

export default function LoginModal() {
  const { showLoginModal, closeLoginModal, login } = useAuthStore();
  const [tab, setTab] = useState<Tab>('phone');
  const [mode, setMode] = useState<Mode>('login');

  // 手机号
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [devCode, setDevCode] = useState('');

  // 邮箱
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 微信
  const [qrUrl, setQrUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrStatus, setQrStatus] = useState<'loading' | 'waiting' | 'scanned' | 'expired'>('loading');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetForm = useCallback(() => {
    setPhone(''); setSmsCode(''); setSmsSent(false); setSmsCountdown(0); setDevCode('');
    setEmail(''); setPassword(''); setError(''); setLoading(false);
    setQrUrl(''); setQrStatus('loading');
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const loadQRCode = useCallback(async () => {
    setQrLoading(true);
    setQrStatus('loading');
    try {
      const data = await getWechatQR();
      setQrUrl(data.qrUrl);
      setQrStatus('waiting');
      const sceneId = data.scene;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const scanData = await pollWechatScan(sceneId);
          if (scanData.status === 'scanned') {
            setQrStatus('scanned');
          } else if (scanData.status === 'confirmed' && scanData.token && scanData.user) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            login(scanData.user, scanData.token);
          } else if (scanData.status === 'expired') {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setQrStatus('expired');
          }
        } catch { /* retry */ }
      }, 2000);
    } catch {
      setQrStatus('expired');
    } finally {
      setQrLoading(false);
    }
  }, [login]);

  useEffect(() => {
    if (showLoginModal) {
      resetForm();
      if (tab === 'wechat') loadQRCode();
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    };
  }, [showLoginModal, tab, resetForm, loadQRCode]);

  // 发送短信
  const handleSendSms = async () => {
    setError('');
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    setLoading(true);
    try {
      const res = await sendSmsCode(phone);
      setSmsSent(true);
      setSmsCountdown(60);
      if (res.devCode) setDevCode(res.devCode);
      // 倒计时
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setSmsCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            countdownRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setLoading(false);
    }
  };

  // 手机验证码登录
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!smsCode || smsCode.length !== 6) { setError('请输入6位验证码'); return; }
    setLoading(true);
    try {
      const data = await verifySmsCode(phone, smsCode);
      login(data.user, data.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '验证失败');
    } finally {
      setLoading(false);
    }
  };

  // 邮箱登录/注册
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const apiFn = mode === 'login' ? loginWithEmail : registerWithEmail;
      const data = await apiFn(email, password);
      login(data.user, data.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!showLoginModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeLoginModal} />
      <div className="relative z-10 w-full max-w-md animate-fade-in-up overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">登录 / 注册</h2>
          <button onClick={closeLoginModal} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {([
            { key: 'phone', label: '手机号', icon: <Phone size={15} /> },
            { key: 'email', label: '邮箱', icon: <Mail size={15} /> },
            { key: 'wechat', label: '微信', icon: <QrCode size={15} /> },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setError(''); }}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                tab === key
                  ? 'border-b-2 border-primary-600 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* 手机号 Tab */}
          {tab === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">手机号码</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="请输入手机号"
                    maxLength={11}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                  <button
                    type="button"
                    onClick={handleSendSms}
                    disabled={loading || smsCountdown > 0 || !/^1[3-9]\d{9}$/.test(phone)}
                    className="shrink-0 rounded-xl bg-primary-50 px-4 py-3 text-sm font-medium text-primary-600 transition-all hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码'}
                  </button>
                </div>
              </div>

              {smsSent && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">验证码</label>
                  <input
                    type="text"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="请输入6位验证码"
                    maxLength={6}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100 tracking-widest text-center text-lg font-semibold"
                  />
                  {devCode && (
                    <p className="mt-1 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                      🔧 开发模式验证码：<strong>{devCode}</strong>
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              {smsSent ? (
                <button
                  type="submit"
                  disabled={loading || smsCode.length !== 6}
                  className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-sm font-semibold text-white shadow-md shadow-primary-200 transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />处理中...
                    </span>
                  ) : '登录 / 注册'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendSms}
                  disabled={loading || !/^1[3-9]\d{9}$/.test(phone)}
                  className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-sm font-semibold text-white shadow-md shadow-primary-200 transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />发送中...
                    </span>
                  ) : '获取验证码'}
                </button>
              )}

              <p className="text-center text-xs text-gray-400">
                未注册手机号将自动创建账号
              </p>
            </form>
          )}

          {/* 邮箱 Tab */}
          {tab === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="flex rounded-lg bg-gray-100 p-1">
                <button type="button" onClick={() => { setMode('login'); setError(''); }}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${mode === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                  登录
                </button>
                <button type="button" onClick={() => { setMode('register'); setError(''); }}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${mode === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                  注册
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">邮箱地址</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="your@email.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">密码</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} required minLength={6}
                    placeholder="至少 6 位字符"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

              <button type="submit" disabled={loading || !email || !password}
                className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-sm font-semibold text-white shadow-md shadow-primary-200 transition-all hover:shadow-lg disabled:opacity-50">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />处理中...
                  </span>
                ) : mode === 'login' ? '登录' : '注册'}
              </button>

              <p className="text-center text-xs text-gray-400">
                {mode === 'register' ? '注册即表示您同意我们的服务条款和隐私政策' : '登录即表示您同意我们的服务条款'}
              </p>
            </form>
          )}

          {/* 微信 Tab */}
          {tab === 'wechat' && (
            <div className="flex flex-col items-center py-4">
              {qrLoading ? (
                <div className="flex h-52 w-52 items-center justify-center rounded-xl bg-gray-50">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              ) : qrStatus === 'waiting' && qrUrl ? (
                <>
                  <div className="overflow-hidden rounded-xl border-2 border-gray-100 bg-white p-2">
                    <img src={qrUrl} alt="微信登录二维码" className="h-52 w-52 object-contain" />
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    请使用 <span className="font-medium text-green-600">微信</span> 扫描二维码登录
                  </p>
                </>
              ) : qrStatus === 'scanned' ? (
                <div className="flex flex-col items-center py-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="mt-4 text-sm font-medium text-gray-900">扫描成功</p>
                  <p className="text-xs text-gray-500">请在手机上确认登录</p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-400">
                    <QrCode size={28} />
                  </div>
                  <p className="mt-4 text-sm text-gray-500">二维码已过期</p>
                  <button onClick={loadQRCode}
                    className="mt-3 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                    刷新二维码
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}