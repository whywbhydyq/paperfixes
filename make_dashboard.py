content = """import { useEffect, useState } from 'react';
import { User, Zap, FileText, Clock, LogOut, ArrowRight, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { fetchQuota } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_BASE || '';

interface JobRecord {
  id: string;
  inputText: string;
  outputText: string | null;
  status: string;
  inputLen: number | null;
  outputLen: number | null;
  createdAt: string;
  doneAt: string | null;
}

export default function DashboardPage() {
  const { user, token, isLoggedIn, logout, openLoginModal, updateQuota } = useAuthStore();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    fetchQuota(token).then((data) => updateQuota(data.quota, data.totalUsed)).catch(() => {});
    loadJobs();
  }, [isLoggedIn, token]);

  const loadJobs = async () => {
    if (!token) return;
    setJobsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {}
    setJobsLoading(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <User size={48} className="mx-auto text-gray-300" />
          <p className="mt-4 text-gray-500">请先登录查看个人中心</p>
          <button onClick={openLoginModal} className="mt-4 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700">登录</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">个人中心</h1>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-600">
              <User size={24} />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{user?.email || user?.wechatName || '用户'}</div>
              <div className="text-sm text-gray-400">{user?.plan === 'pro' ? '专业套餐' : user?.plan === 'basic' ? '基础套餐' : '免费套餐'}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Zap size={18} /></div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{user?.quota ?? 0}</div>
                <div className="text-xs text-gray-400">剩余额度</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600"><FileText size={18} /></div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{user?.totalUsed ?? 0}</div>
                <div className="text-xs text-gray-400">累计改写次数</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Link to="/" className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm transition-all hover:border-primary-100 hover:shadow-md">
            <div className="flex items-center gap-3"><FileText size={18} className="text-primary-600" /><span className="font-medium text-gray-900">开始改写</span></div>
            <ArrowRight size={16} className="text-gray-400" />
          </Link>
          <Link to="/pricing" className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm transition-all hover:border-amber-100 hover:shadow-md">
            <div className="flex items-center gap-3"><Zap size={18} className="text-amber-600" /><span className="font-medium text-gray-900">购买额度</span></div>
            <ArrowRight size={16} className="text-gray-400" />
          </Link>
          <button onClick={logout} className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm transition-all hover:border-red-100 hover:shadow-md">
            <div className="flex items-center gap-3"><LogOut size={18} className="text-red-500" /><span className="font-medium text-gray-900">退出登录</span></div>
          </button>
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">改写历史</h2>
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
                              <button
                                onClick={() => handleCopy(job.outputText!, job.id)}
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600"
                              >
                                {copiedId === job.id ? <><Check size={12} className="text-green-500" />已复制</> : <><Copy size={12} />复制</>}
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
      </div>
    </div>
  );
}
"""

with open('src/pages/DashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("✓ DashboardPage 完成")
