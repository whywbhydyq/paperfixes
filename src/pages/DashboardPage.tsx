import { useEffect } from 'react';
import { User, Zap, FileText, Clock, LogOut, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { fetchQuota } from '../lib/api';

export default function DashboardPage() {
  const { user, token, isLoggedIn, logout, openLoginModal, updateQuota } = useAuthStore();
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    fetchQuota(token)
      .then((data) => updateQuota(data.quota, data.totalUsed))
      .catch(() => {});
  }, [isLoggedIn, token, updateQuota]);

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <User size={48} className="mx-auto text-gray-300" />
          <p className="mt-4 text-gray-500">请先登录查看个人中心</p>
          <button
            onClick={openLoginModal}
            className="mt-4 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">个人中心</h1>

        {/* Profile card */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-600">
              <User size={24} />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {user?.email || user?.wechatName || '用户'}
              </div>
              <div className="text-sm text-gray-400">
                {user?.email ? '邮箱登录' : '微信登录'}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
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
                <div className="text-xs text-gray-400">已使用次数</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Link
            to="/"
            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm transition-all hover:border-primary-100 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-primary-600" />
              <span className="font-medium text-gray-900">开始改写</span>
            </div>
            <ArrowRight size={16} className="text-gray-400" />
          </Link>

          <Link
            to="/pricing"
            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm transition-all hover:border-amber-100 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-amber-600" />
              <span className="font-medium text-gray-900">购买额度</span>
            </div>
            <ArrowRight size={16} className="text-gray-400" />
          </Link>

          <button
            onClick={logout}
            className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm transition-all hover:border-red-100 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <LogOut size={18} className="text-red-500" />
              <span className="font-medium text-gray-900">退出登录</span>
            </div>
          </button>
        </div>

        {/* Notice */}
        <div className="mt-8 rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-400">
          <div className="flex items-center justify-center gap-4">
            <span className="flex items-center gap-1"><Clock size={12} /> 历史记录功能即将上线</span>
          </div>
        </div>
      </div>
    </div>
  );
}
