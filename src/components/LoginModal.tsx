import { useState, useEffect } from 'react';
import { X, Phone, Lock, Eye, EyeOff, Loader2, MessageSquare, KeyRound } from 'lucide-react';
import { useAuthStore, type User } from '../store/useAuthStore';
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
  const [sendLoading, setSendLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState('');
  const [needSetPwd, setNeedSetPwd] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [tempUser, setTempUser] = useState<User | null>(null);

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
    if (!/^1[3-9]\d{9}$/.test(phone)) { setError('请输入正确的手机号'); return; }
    setSendLoading(true);
    try {
      const data = await sendSmsCode(phone);
      if (data.devCode) setDevCode(data.devCode);
      setCountdown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally { setSendLoading(false); }
  };

  const handleSmsLogin = async () => {
    setError('');
    if (!/^1[3-9]\d{9}$/.test(phone)) { setError('请输入正确的手机号'); return; }
    if (!code) { setError('请输入验证码'); return; }
    setLoginLoading(true);
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
    } finally { setLoginLoading(false); }
  };

  const handlePwdLogin = async () => {
    setError('');
    if (!/^1[3-9]\d{9}$/.test(phone)) { setError('请输入正确的手机号'); return; }
    if (!password) { setError('请输入密码'); return; }
    setLoginLoading(true);
    try {
      const data = await phonePasswordLogin(phone, password);
      login(data.user, data.token);
      closeLoginModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally { setLoginLoading(false); }
  };

  const handleSetPwd = async () => {
    setError('');
    if (newPwd.length < 6) { setError('密码至少6位'); return; }
    if (newPwd !== confirmPwd) { setError('两次密码不一致'); return; }
    if (!tempUser || !tempToken) { setError('登录状态异常，请重新获取验证码'); return; }
    setLoginLoading(true);
    try {
      await setUserPassword(newPwd, tempToken);
      login({ ...tempUser, hasPassword: true }, tempToken);
      closeLoginModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '设置失败');
    } finally { setLoginLoading(false); }
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
            <button onClick={handleSetPwd} disabled={loginLoading || !newPwd || !confirmPwd}
              className="w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
              {loginLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />设置中...</span> : '确认设置'}
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
                  <button onClick={handleSendCode} disabled={countdown > 0 || !/^1[3-9]\d{9}$/.test(phone) || sendLoading}
                    className="shrink-0 rounded-xl bg-primary-50 px-4 text-sm font-medium text-primary-600 hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed">
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </button>
                </div>
                {devCode && (
                  <p className="mt-1 text-xs text-amber-600">开发模式验证码：{devCode}</p>
                )}
              </div>
              <button onClick={handleSmsLogin} disabled={loginLoading || !/^1[3-9]\d{9}$/.test(phone) || code.length !== 6}
                className="w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                {loginLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />登录中...</span> : '登录 / 注册'}
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
              <button onClick={handlePwdLogin} disabled={loginLoading || !/^1[3-9]\d{9}$/.test(phone) || !password}
                className="w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                {loginLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />登录中...</span> : '登录'}
              </button>
              <p className="text-center text-xs text-gray-400">未设密码？请使用验证码登录</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
