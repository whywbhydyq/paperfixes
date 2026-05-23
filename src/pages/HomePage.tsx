import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, Zap, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50/60 via-white to-white pt-16 pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-100/40 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-4 py-1.5 text-sm font-medium text-primary-700">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-500"></span>
            </span>
            专注论文与技术文档 · 新用户 3 次免费体验
          </div>

          <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-6xl">
            AI论文降重
            <br />
            <span className="bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              与学术表达优化工具
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 leading-relaxed">
            粘贴摘要、引言、文献综述或结论等高风险段落，PaperFix 会在保留原意和技术术语的前提下，
            优化机器化表达、重构句式并控制字数。
            <span className="font-semibold text-gray-800">结果仅供写作辅助，提交前请人工复核。</span>
          </p>

          <div className="mx-auto mt-5 flex max-w-2xl items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-left text-sm leading-6 text-amber-800">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <p>
              PaperFix 不承诺任何检测平台一定通过，也不能替代原创研究。请重点复核原意、数据、引用、术语和段落衔接。
            </p>
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/"
              className="group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-200 transition-all hover:shadow-xl hover:shadow-primary-300 active:scale-[0.97]"
            >
              免费试用 3 次，优化一段论文
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/examples"
              className="rounded-2xl border border-gray-200 bg-white px-8 py-4 text-base font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
            >
              查看改写示例
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-green-500" />
              不留存原文
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-green-500" />
              术语保护
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-green-500" />
              字数严格控制
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-green-500" />
              人工复核辅助
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">专业学术改写，而非简单替换</h2>
            <p className="mt-3 text-gray-500">面向论文段落的表达优化流程，每一步都需要保留原意并便于人工复核</p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <div className="group rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/50 p-8 transition-all hover:border-primary-100 hover:shadow-lg hover:shadow-primary-50">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                <FileText size={22} />
              </div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">智能句式重构</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                通过改写句式结构、调整连接方式和减少模板化表达，让论文段落更接近自然写作，而不是只做近义词替换。
              </p>
            </div>

            <div className="group rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/50 p-8 transition-all hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-50">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <ShieldCheck size={22} />
              </div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">技术术语保护</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Django、Ceph、JWT、ORM、views.py 等专有名词会尽量保持稳定。计算机、医学、理工科论文仍需人工复核关键术语。
              </p>
            </div>

            <div className="group rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/50 p-8 transition-all hover:border-amber-100 hover:shadow-lg hover:shadow-amber-50">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                <Zap size={22} />
              </div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">字数严格控制</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                输出字数控制在原文的 ±5% 以内，降低字数暴增或缩减带来的排版和篇幅问题，适合分段处理论文内容。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-gray-50/80 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">简单三步，完成表达优化</h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white shadow-lg shadow-primary-200">
                1
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">粘贴文本</h3>
              <p className="text-sm text-gray-500">优先选择摘要、引言、文献综述或检测报告中的高风险段落</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white shadow-lg shadow-primary-200">
                2
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">智能优化</h3>
              <p className="text-sm text-gray-500">系统进行句式重构、表达调整和术语保护，通常10-30秒完成</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white shadow-lg shadow-primary-200">
                3
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">人工复核</h3>
              <p className="text-sm text-gray-500">逐段检查原意、术语、数据、引用和上下文衔接后再使用</p>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantees */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-10">
            <h3 className="mb-6 text-2xl font-bold text-gray-900">我们的承诺</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                '处理完成后不留存任何原文',
                '技术专有名词尽量保持稳定',
                '输出字数控制在原文±5%以内',
                '失败自动退还额度',
                '支持手机号和邮箱登录',
                '结果仅供写作辅助，必须人工复核',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="shrink-0 text-primary-600" />
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary-200 transition-all hover:shadow-lg active:scale-[0.97]"
              >
                免费试用并优化一段论文
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
