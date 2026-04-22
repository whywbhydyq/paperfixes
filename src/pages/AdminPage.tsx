import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
  FileText, Users, Settings, Save, RefreshCw, ArrowLeft,
  Shield, Edit3, Check, X, Plus,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function apiFetch(path: string, token: string | null, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(d.error || `错误 ${res.status}`);
  }
  return res.json();
}

interface PlanConfig {
  planKey: string; name: string; price: number; quota: number;
  minChars: number; maxChars: number; features: string[];
  popular: boolean; active: boolean; sortOrder: number;
}

interface UserInfo {
  id: string; email: string | null; phone: string | null;
  wechatName: string | null; role: string; plan: string;
  quota: number; totalUsed: number; createdAt: string;
}

export default function AdminPage() {
  const { user, token, isLoggedIn, openLoginModal } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'users' | 'pricing'>('users');
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ quota: number; plan: string; role: string }>({
    quota: 0, plan: 'free', role: 'user',
  });
  const [saveMsg, setSaveMsg] = useState('');

  // 手动充值弹窗
  const [topupUserId, setTopupUserId] = useState<string | null>(null);
  const [topupAmount, setTopupAmount] = useState(10);
  const [topupNote, setTopupNote] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  const isAdmin = isLoggedIn && user && (user.role === 'admin' || user.email === '2922027393@qq.com');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/users', token);
      setUsers(data.users);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/config', token);
      setPlans(data.plans);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!isLoggedIn) { openLoginModal(); return; }
    if (!isAdmin) return;
    if (tab === 'users') loadUsers();
    else loadPlans();
  }, [tab, isLoggedIn, isAdmin, loadUsers, loadPlans, openLoginModal]);

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-gray-300" />
          <p className="mt-4 text-gray-500">请先登录</p>
          <button onClick={openLoginModal}
            className="mt-4 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
            登录
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-red-300" />
          <p className="mt-4 text-gray-500">无权限访问此页面</p>
        </div>
      </div>
    );
  }

  const handleSaveUser = async (userId: string) => {
    try {
      await apiFetch(`/api/admin/users?id=${userId}`, token, {
        method: 'PUT', body: JSON.stringify(editData),
      });
      setEditingUserId(null);
      loadUsers();
      setSaveMsg('用户信息已更新');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '保存失败');
    }
  };

  const handleTopup = async () => {
    if (!topupUserId || topupAmount <= 0) return;
    setTopupLoading(true);
    try {
      await apiFetch('/api/admin/topup', token, {
        method: 'POST',
        body: JSON.stringify({
          userId: topupUserId,
          amount: topupAmount,
          price: 0,
          planKey: 'manual',
          note: topupNote || '管理员手动充值',
        }),
      });
      setTopupUserId(null);
      setTopupAmount(10);
      setTopupNote('');
      loadUsers();
      setSaveMsg(`成功充值 ${topupAmount} 次`);
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '充值失败');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleSavePlans = async () => {
    try {
      await apiFetch('/api/admin/config', token, {
        method: 'PUT', body: JSON.stringify({ plans }),
      });
      setSaveMsg('定价配置已保存');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '保存失败');
    }
  };

  const startEditUser = (u: UserInfo) => {
    setEditingUserId(u.id);
    setEditData({ quota: u.quota, plan: u.plan, role: u.role });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">管理控制台</h1>
              <p className="text-xs text-gray-400">仅管理员可见 · {user?.email}</p>
            </div>
          </div>
          {saveMsg && (
            <div className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-sm text-green-700">
              <Check size={14} /> {saveMsg}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button onClick={() => setTab('users')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${tab === 'users' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
            <Users size={16} /> 用户管理
          </button>
          <button onClick={() => setTab('pricing')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${tab === 'pricing' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}>
            <Settings size={16} /> 定价配置
          </button>
        </div>

        {/* 充值弹窗 */}
        {topupUserId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setTopupUserId(null)} />
            <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">手动充值</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">充值次数</label>
                  <input type="number" value={topupAmount} min={1}
                    onChange={(e) => setTopupAmount(parseInt(e.target.value) || 0)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">备注</label>
                  <input type="text" value={topupNote}
                    onChange={(e) => setTopupNote(e.target.value)}
                    placeholder="管理员手动充值"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setTopupUserId(null)}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                    取消
                  </button>
                  <button onClick={handleTopup} disabled={topupLoading || topupAmount <= 0}
                    className="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                    {topupLoading ? '充值中...' : `确认充值 ${topupAmount} 次`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-semibold text-gray-900">所有用户 ({users.length})</h2>
              <button onClick={loadUsers}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
                <RefreshCw size={14} /> 刷新
              </button>
            </div>
            {loading ? (
              <div className="p-12 text-center text-gray-400">加载中...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">账号</th>
                      <th className="px-4 py-3 text-left font-medium">角色</th>
                      <th className="px-4 py-3 text-left font-medium">套餐</th>
                      <th className="px-4 py-3 text-center font-medium">额度</th>
                      <th className="px-4 py-3 text-center font-medium">已用</th>
                      <th className="px-4 py-3 text-left font-medium">注册时间</th>
                      <th className="px-4 py-3 text-center font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <div className="font-medium text-gray-900">
                            {u.email || u.phone || u.wechatName || '-'}
                          </div>
                          <div className="text-xs text-gray-400 truncate max-w-[180px]">
                            {u.phone && u.email ? `📱${u.phone}` : u.phone ? `📱${u.phone}` : ''}
                          </div>
                          <div className="text-xs text-gray-300 truncate max-w-[180px]">{u.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          {editingUserId === u.id ? (
                            <select value={editData.role}
                              onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                              className="rounded border px-2 py-1 text-xs">
                              <option value="user">用户</option>
                              <option value="admin">管理员</option>
                            </select>
                          ) : (
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                              {u.role === 'admin' ? '管理员' : '用户'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingUserId === u.id ? (
                            <select value={editData.plan}
                              onChange={(e) => setEditData({ ...editData, plan: e.target.value })}
                              className="rounded border px-2 py-1 text-xs">
                              <option value="free">免费</option>
                              <option value="basic">基础</option>
                              <option value="pro">专业</option>
                            </select>
                          ) : (
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.plan === 'pro' ? 'bg-amber-100 text-amber-700' : u.plan === 'basic' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
                              {u.plan === 'pro' ? '专业' : u.plan === 'basic' ? '基础' : '免费'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingUserId === u.id ? (
                            <input type="number" value={editData.quota}
                              onChange={(e) => setEditData({ ...editData, quota: parseInt(e.target.value) || 0 })}
                              className="w-16 rounded border px-2 py-1 text-center text-xs" />
                          ) : (
                            <span className="font-medium text-primary-600">{u.quota}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{u.totalUsed}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingUserId === u.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleSaveUser(u.id)}
                                className="rounded p-1 text-green-600 hover:bg-green-50">
                                <Check size={16} />
                              </button>
                              <button onClick={() => setEditingUserId(null)}
                                className="rounded p-1 text-red-400 hover:bg-red-50">
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => startEditUser(u)}
                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-primary-600"
                                title="编辑">
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={() => { setTopupUserId(u.id); setTopupAmount(10); setTopupNote(''); }}
                                className="rounded p-1 text-gray-400 hover:bg-green-50 hover:text-green-600"
                                title="手动充值">
                                <Plus size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <div className="p-12 text-center text-gray-400">暂无用户</div>}
              </div>
            )}
          </div>
        )}

        {/* Pricing Tab */}
        {tab === 'pricing' && (
          <div className="space-y-4">
            {plans.map((plan, idx) => (
              <div key={plan.planKey} className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${plan.popular ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'}`}>
                    <FileText size={16} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <span className="text-xs text-gray-400">({plan.planKey})</span>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  {[
                    { label: '价格（元）', field: 'price' as const },
                    { label: '包含次数', field: 'quota' as const },
                    { label: '最小字数', field: 'minChars' as const },
                    { label: '最大字数', field: 'maxChars' as const },
                  ].map(({ label, field }) => (
                    <div key={field}>
                      <label className="mb-1 block text-xs text-gray-500">{label}</label>
                      <input type="number" value={plan[field] as number}
                        onChange={(e) => {
                          const updated = [...plans];
                          updated[idx] = { ...updated[idx], [field]: parseInt(e.target.value) || 0 };
                          setPlans(updated);
                        }}
                        className="w-full rounded-lg border px-3 py-2 text-sm" />
                    </div>
                  ))}
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">标签</label>
                    <input type="text" value={plan.features.join('、')}
                      onChange={(e) => {
                        const updated = [...plans];
                        updated[idx] = { ...updated[idx], features: e.target.value.split('、') };
                        setPlans(updated);
                      }}
                      className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={handleSavePlans} disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-700 disabled:opacity-50">
              <Save size={16} /> 保存定价配置
            </button>
          </div>
        )}
      </div>
    </div>
  );
}