import { FileText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 text-white">
                <FileText size={14} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-gray-900">学术改写引擎</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              自研学术改写引擎，严格遵循专业修改指令，技术术语零破坏，输出字数严格控制。
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900">产品</h4>
            <div className="space-y-2">
              <Link to="/" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">开始改写</Link>
              <Link to="/home" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">了解更多</Link>
              <Link to="/pricing" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">定价方案</Link>
              <Link to="/dashboard" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">个人中心</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900">安全保障</h4>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-green-500" />
                处理完成后不留存任何原文
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-green-500" />
                端到端加密传输
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-green-500" />
                不泄露任何个人数据
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          <p>本工具仅供学术交流使用 · 生成内容请人工二次校对</p>
          <p className="mt-1">© {new Date().getFullYear()} 学术改写引擎 · 保留所有权利</p>
        </div>
      </div>
    </footer>
  );
}