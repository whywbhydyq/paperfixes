import { FileText, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 text-white">
                <FileText size={14} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-gray-900">学术改写引擎</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              专注中文学术文本智能改写，帮助研究者优化论文表达，提升文本原创性评分。
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900">产品</h4>
            <div className="space-y-2">
              <a href="/" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">开始改写</a>
              <a href="/examples" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">改写示例</a>
              <a href="/pricing" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">定价方案</a>
              <a href="/dashboard" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">个人中心</a>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900">内容</h4>
            <div className="space-y-2">
              <a href="/home" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">了解更多</a>
              <a href="/blog" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">专题指南</a>
              <a href="/faq" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">常见问题</a>
              <a href="/privacy" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">隐私政策</a>
              <a href="/terms" className="block text-sm text-gray-500 hover:text-primary-600 transition-colors">服务条款</a>
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900">服务承诺</h4>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-green-500 shrink-0" />
                改写失败自动退还额度
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-green-500 shrink-0" />
                技术术语尽量保持稳定
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-green-500 shrink-0" />
                原文与结果保存在账号历史
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6">
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-6 text-xs text-amber-800 leading-relaxed">
            <p className="font-semibold mb-1">⚠️ 使用须知与免责声明</p>
            <p>本工具仅提供文本改写辅助服务，生成内容仅供参考，请务必进行人工审核与二次校对。根据相关法规，在获得学位过程中如有学术不端行为，经审议可由学位授予单位撤销学位证书。本平台明确反对任何形式的学术不端行为，用户须自行承担使用本工具的全部法律责任。</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-400">
            <p>© {new Date().getFullYear()} 学术改写引擎 · 保留所有权利</p>
            <p>本工具仅供学术研究与写作辅助使用</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
