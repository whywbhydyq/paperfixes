import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Menu, X, User, LogOut, Zap, Shield } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { fetchQuota } from '../lib/api';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const { user, token, isLoggedIn, logout, openLoginModal, updateQuota } = useAuthStore();

  const isAdmin = isLoggedIn && user && (user.role === 'admin' || user.email === '2922027393@qq.com');

  useEffect(() => {
    if (isLoggedIn && token) {
      fetchQuota(token).then((data) => {
        updateQuota(data.quota, data.totalUsed);
      }).catch(() => {});
    }
  }, [isLoggedIn, token, updateQuota]);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/', label: '开始改写', matchExact: true },
    { to: '/home', label: '了解更多' },
    { to: '/pricing', label: '定价' },
  ];

  const isActive = (link: typeof navLinks[0]) => {
    if (link.matchExact) return location.pathname === '/';
    return location.pathname === link.to;
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-md shadow-primary-200">
            <FileText size={18} strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-bold tracking-tight text-gray-900">学术改写引擎</div>
            <div className="text-[10px] text-gray-400">专注降低AIGC检测率</div>
          </div>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isActive(link) ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isLoggedIn ? (
            <>
              <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                <Zap size={13} />
                剩余 {user?.quota ?? 0} 次
              </div>
              <div className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200">
                  <User size={16} />
                </button>
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border bg-white py-1 shadow-xl">
                      <div className="border-b px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 truncate">{user?.email || user?.wechatName || (user?.phone ? '手机用户' + user.phone.slice(-4) : '用户')}</div>
                        <div className="text-xs text-gray-400">已使用 {user?.totalUsed ?? 0} 次</div>
                      </div>
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setDropdownOpen(false)} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-primary-600 hover:bg-primary-50">
                          <Shield size={14} /> 管理控制台
                        </Link>
                      )}
                      <Link to="/dashboard" onClick={() => setDropdownOpen(false)} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        <User size={14} /> 个人中心
                      </Link>
                      <button onClick={() => { logout(); setDropdownOpen(false); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                        <LogOut size={14} /> 退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <button onClick={openLoginModal} className="rounded-xl px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">登录</button>
              <button onClick={openLoginModal} className="rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-2 text-sm font-medium text-white shadow-md shadow-primary-200 transition-all hover:shadow-lg hover:shadow-primary-300 active:scale-[0.97]">免费试用</button>
            </>
          )}
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t bg-white px-6 py-4 md:hidden">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className={`block rounded-lg px-4 py-2.5 text-sm font-medium ${isActive(link) ? 'bg-primary-50 text-primary-700' : 'text-gray-600'}`}>
              {link.label}
            </Link>
          ))}
          <div className="mt-3 border-t pt-3">
            {isLoggedIn ? (
              <>
                {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block rounded-lg px-4 py-2.5 text-sm text-primary-600 hover:bg-primary-50">🛡️ 管理控制台</Link>}
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block rounded-lg px-4 py-2.5 text-sm text-gray-700">个人中心</Link>
                <button onClick={() => { logout(); setMobileOpen(false); }} className="w-full rounded-lg px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">退出登录</button>
              </>
            ) : (
              <button onClick={() => { openLoginModal(); setMobileOpen(false); }} className="w-full rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white">登录 / 注册</button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
