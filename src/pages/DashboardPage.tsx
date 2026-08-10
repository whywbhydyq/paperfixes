import {  useEffect, useState , useRef } from 'react';
import {
  User, Zap, FileText, Clock, LogOut, ArrowRight,
  ChevronDown, ChevronUp, Copy, Check, Receipt, Key, Eye, EyeOff, Loader2, Gift,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { getPlanDisplayName } from '../lib/plan-display';
import {
  fetchQuota, fetchTopups, fetchJobs, changePassword, redeemPlanCodeRequest,
  type TopupRecord, type JobRecord,
} from '../lib/api';

type ActiveTab = 'history' | 'topups' | 'redeem' | 'password';

export default function DashboardPage() {
  const { user, isLoggedIn, logout, openLoginModal, updateUserEntitlements } = useAuthStore();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('history');

  // 充值记录
  const [topups, setTopups] = useState<TopupRecord[]>([]);
  const [topupsLoading, setTopupsLoading] = useState(false);

  // 套餐兑换码
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState('');
  const [redeemError, setRedeemError] = useState('');

  // 修改密码
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState('');

  const [searchParams] = useSearchParams();
  const tabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab && ['history', 'topups', 'redeem', 'password'].includes(requestedTab)) {
      setActiveTab(requestedTab as ActiveTab);
    }
    if (requestedTab && tabRef.current) {
      tabRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchQuota().then((data) => updateUserEntitlements(data)).catch(() => {});
    loadJobs();
  }, [isLoggedIn, updateUserEntitlements]);

  useEffect(() => {
    if (activeTab === 'topups' && isLoggedIn) loadTopups();
  }, [activeTab, isLoggedIn]);

  const loadJobs = async () => {
    if (!isLoggedIn) return;
    setJobsLoading(true);
    try {
      const data = await fetchJobs();
      setJobs(data.jobs || []);
    } catch {}
    setJobsLoading(false);
  };

  const loadTopups = async () => {
    if (!isLoggedIn) return;
    setTopupsLoading(true);
    try {
      const data = await fetchTopups();
      setTopups(data.topups || []);
    } catch {}
    setTopupsLoading(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdMsg('');
    if (newPassword.length < 6) { setPwdError('新密码至少6位'); return; }
    if (newPassword !== confirmPassword) { setPwdError('两次密码不一致'); return; }
    setPwdLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setPwdMsg('密码修改成功');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: unknown) {
      setPwdError(err instanceof Error ? err.message : '修改失败');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = redeemCode.trim();
    if (!code) return;
    setRedeemLoading(true);
    setRedeemMsg('');
    setRedeemError('');
    try {
      const data = await redeemPlanCodeRequest(redeemCode);
      updateUserEntitlements({
        ...data.entitlements,
        totalUsed: user?.totalUsed ?? 0,
      });
      setRedeemMsg(data.status === 'already_redeemed'
        ? '这个兑换码已兑换过，当前套餐信息已刷新。'
        : `兑换成功，已增加 ${data.redemption.quota} 次额度。`);
      setRedeemCode('');
    } catch (error) {
      setRedeemError(error instanceof Error ? error.message : '兑换失败，请稍后重试');
    } finally {
      setRedeemLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <User size={48} className="mx-auto text-gray-300" />
          <p className="mt-4 text-gray-500">请先登录查看个人中心</p>
          <button onClick={openLoginModal}
            className="mt-4 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
            登录
          </button>
        </div>
      </div>
    );
  }

  const rawPhone = user?.phone;
  const displayName = user?.email 
    || user?.wechatName 
    || (rawPhone ? '手机用户' + rawPhone.slice(-4) : null)
    || '用户';
  const planName = getPlanDisplayName(user?.plan);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">个人中心</h1>

        {/* 用户信息卡 */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-600">
              <User size={24} />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{displayName}</div>
              <div className="text-sm text-gray-400">{planName}</div>
              {user?.plan !== 'free' && user?.planExpiresAt && (
                <div className="mt-1 text-xs text-amber-600">
                  有效期至 {new Date(user.planExpiresAt).toLocaleString('zh-CN')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Zap size={18} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{user?.quota ?? 0}</div>
                <div className="text-xs text-gray-400">剩余额度</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">
                <FileText size={18} />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{user?.totalUsed ?? 0}</div>
                <div className="text-xs text-gray-400">累计改写次数</div>
              </div>
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="mt-6 space-y-3">
          <Link to="/" className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm transition-all hover:border-primary-100 hover:shadow-md">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-primary-600" />
              <span className="font-medium text-gray-900">开始改写</span>
            </div>
            <ArrowRight size={16} className="text-gray-400" />
          </Link>
          <Link to="/pricing" className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm transition-all hover:border-amber-100 hover:shadow-md">
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-amber-600" />
              <span className="font-medium text-gray-900">购买额度</span>
            </div>
            <ArrowRight size={16} className="text-gray-400" />
          </Link>
          <button onClick={logout} className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm transition-all hover:border-red-100 hover:shadow-md">
            <div className="flex items-center gap-3">
              <LogOut size={18} className="text-red-500" />
              <span className="font-medium text-gray-900">退出登录</span>
            </div>
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="mt-10" ref={tabRef}>
          <div className="flex gap-2 overflow-x-auto border-b border-gray-200">
            {([
              { key: 'history', label: '改写历史', icon: <Clock size={14} /> },
              { key: 'topups', label: '充值记录', icon: <Receipt size={14} /> },
              { key: 'redeem', label: '套餐兑换码', icon: <Gift size={14} /> },
              { key: 'password', label: '修改密码', icon: <Key size={14} /> },
            ] as const).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {/* 改写历史 */}
          {activeTab === 'history' && (
            <div className="mt-4">
              <div className="flex justify-end mb-3">
                <button onClick={loadJobs} className="text-xs text-primary-600 hover:text-primary-700">刷新</button>
              </div>
              {jobsLoading ? (
                <div className="text-center py-12 text-gray-400">加载中...</div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12 text-gray-400 rounded-2xl border border-dashed border-gray-200">
                  <Clock size={32} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">暂无改写记录</p>
                  <Link to="/" className="mt-3 inline-block text-sm text-primary-600 hover:underline">去改写一篇</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div key={job.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                      <div
                        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {job.inputText.slice(0, 60)}{job.inputText.length > 60 ? '...' : ''}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {new Date(job.createdAt).toLocaleString('zh-CN')}
                            </span>
                            {job.inputLen && <span>原文 {job.inputLen} 字</span>}
                            {job.outputLen && <span>结果 {job.outputLen} 字</span>}
                            <span className={`px-2 py-0.5 rounded-full font-medium ${
                              job.status === 'DONE' ? 'bg-green-100 text-green-700'
                              : job.status === 'FAILED' ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {job.status === 'DONE' ? '完成' : job.status === 'FAILED' ? '失败' : '处理中'}
                            </span>
                          </div>
                        </div>
                        {expandedJob === job.id
                          ? <ChevronUp size={16} className="text-gray-400 shrink-0" />
                          : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                      </div>
                      {expandedJob === job.id && (
                        <div className="border-t border-gray-100 p-5">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-500">原文</span>
                              </div>
                              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-3 max-h-52 overflow-y-auto custom-scrollbar">
                                {job.inputText}
                              </div>
                            </div>
                            {job.outputText && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-gray-500">改写结果</span>
                                  <button onClick={() => handleCopy(job.outputText!, job.id)}
                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600">
                                    {copiedId === job.id
                                      ? <><Check size={12} className="text-green-500" />已复制</>
                                      : <><Copy size={12} />复制</>}
                                  </button>
                                </div>
                                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-green-50 rounded-xl p-3 max-h-52 overflow-y-auto custom-scrollbar">
                                  {job.outputText}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 充值记录 */}
          {activeTab === 'topups' && (
            <div className="mt-4">
              {topupsLoading ? (
                <div className="text-center py-12 text-gray-400">加载中...</div>
              ) : topups.length === 0 ? (
                <div className="text-center py-12 text-gray-400 rounded-2xl border border-dashed border-gray-200">
                  <Receipt size={32} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">暂无充值记录</p>
                  <Link to="/pricing" className="mt-3 inline-block text-sm text-primary-600 hover:underline">去购买额度</Link>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-5 py-3 text-left font-medium">时间</th>
                        <th className="px-5 py-3 text-left font-medium">套餐</th>
                        <th className="px-5 py-3 text-center font-medium">增加次数</th>
                        <th className="px-5 py-3 text-center font-medium">金额</th>
                        <th className="px-5 py-3 text-left font-medium">备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {topups.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3 text-gray-500 text-xs">
                            {new Date(t.createdAt).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700">
                              {t.planKey === 'free' ? '免费' : t.planKey === 'basic' ? '基础' : t.planKey === 'pro' ? '专业' : t.planKey}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center font-semibold text-green-600">+{t.amount}</td>
                          <td className="px-5 py-3 text-center text-gray-700">
                            {t.price === 0 ? '免费' : `¥${t.price}`}
                          </td>
                          <td className="px-5 py-3 text-gray-400 text-xs">{t.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                </div>
              )}
            </div>
          )}

          {/* 套餐兑换码 */}
          {activeTab === 'redeem' && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                  <Gift size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">兑换套餐</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    输入购买后收到的一次性兑换码。兑换成功后，额度立即到账；有效套餐会在当前到期日后再叠加 30 天。
                  </p>
                </div>
              </div>
              <form onSubmit={handleRedeem} className="mt-5 max-w-xl">
                <label htmlFor="plan-redemption-code" className="mb-1.5 block text-sm font-medium text-gray-700">
                  套餐兑换码
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="plan-redemption-code"
                    value={redeemCode}
                    onChange={(event) => setRedeemCode(event.target.value)}
                    placeholder="PF-XXXXX-XXXXX-XXXXX-XXXXX"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={80}
                    className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm uppercase outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                  <button
                    type="submit"
                    disabled={redeemLoading || !redeemCode.trim()}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700 disabled:opacity-50"
                  >
                    {redeemLoading ? <><Loader2 size={16} className="animate-spin" />兑换中...</> : '立即兑换'}
                  </button>
                </div>
                {redeemError && (
                  <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{redeemError}</div>
                )}
                {redeemMsg && (
                  <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{redeemMsg}</div>
                )}
              </form>
            </div>
          )}

          {/* 修改密码 */}
          {activeTab === 'password' && (
            <div className="mt-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                {user?.phone && !user?.email && (
                  <div className="mb-4 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
                    您当前使用手机号登录。如需设置密码以支持邮箱登录，请留空「当前密码」直接设置新密码
                  </div>
                )}
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">当前密码</label>
                    <div className="relative">
                      <input
                        type={showOld ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="请输入当前密码"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                      <button type="button" onClick={() => setShowOld(!showOld)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">新密码</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="至少6位字符"
                        minLength={6}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">确认新密码</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="再次输入新密码"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                  {pwdError && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{pwdError}</div>}
                  {pwdMsg && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{pwdMsg}</div>}
                  <button
                    type="submit"
                    disabled={pwdLoading || !newPassword || !confirmPassword || (!!user?.hasPassword && !oldPassword)}
                    className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700 disabled:opacity-50"
                  >
                    {pwdLoading ? <><Loader2 size={16} className="animate-spin" />修改中...</> : '确认修改'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
