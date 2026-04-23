import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

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
            专注学术文本 · 降低AIGC检测率
          </div>

          <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-6xl">
            自研学术改写引擎
            <br />
            <span className="bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              智能降低AIGC检测率
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 leading-relaxed">
            严格遵循专业修改指令，执行增加解释性词汇、系统性同义替换、句式重构等策略，
            <span className="font-semibold text-gray-800">绝不破坏技术术语</span>，
            严格控制输出字数，处理完成后不留存任何原文。
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/"
              className="group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-200 transition-all hover:shadow-xl hover:shadow-primary-300 active:scale-[0.97]"
            >
              开始改写
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="rounded-2xl border border-gray-200 bg-white px-8 py-4 text-base font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow"
            >
              了解更多
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-green-500" />
              不留存原文
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-green-500" />
              术语零破坏
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-green-500" />
              字数严格控制
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-green-500" />
              手机号/邮箱登录
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">专业学术改写，而非简单替换</h2>
            <p className="mt-3 text-gray-500">引擎严格按照专业论文修改指令执行，每一处改动都有据可循</p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <div className="group rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/50 p-8 transition-all hover:border-primary-100 hover:shadow-lg hover:shadow-primary-50">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                <FileText size={22} />
              </div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">智能句式重构</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                通过增加解释性冗余、把字句转换、括号自然融合等策略，从句法层面降低AI特征，而非简单的近义词替换。
              </p>
            </div>

            <div className="group rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/50 p-8 transition-all hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-50">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <ShieldCheck size={22} />
              </div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">技术术语零破坏</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Django、Ceph、JWT、ORM、views.py 等专有名词绝对不修改。完美适配计算机、医学、理工科论文。
              </p>
            </div>

            <div className="group rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/50 p-8 transition-all hover:border-amber-100 hover:shadow-lg hover:shadow-amber-50">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                <Zap size={22} />
              </div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">字数严格控制</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                输出字数控制在原文的 ±5% 以内，双保险机制确保不会出现字数暴增或缩减，满足论文字数要求。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-gray-50/80 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">简单三步，完成改写</h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white shadow-lg shadow-primary-200">
                1
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">粘贴文本</h3>
              <p className="text-sm text-gray-500">将需要降重的论文段落粘贴到输入框，支持批量处理</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white shadow-lg shadow-primary-200">
                2
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">智能改写</h3>
              <p className="text-sm text-gray-500">先进学术改写引擎自动执行多策略修改，通常10-30秒完成</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white shadow-lg shadow-primary-200">
                3
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">获取结果</h3>
              <p className="text-sm text-gray-500">改写完成即时显示，原文不会被留存，安全可靠</p>
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
                '技术专有名词绝对不修改',
                '输出字数控制在原文±5%以内',
                '失败自动退还额度',
                '支持手机号和邮箱登录',
                '数据传输端到端加密',
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
                立即开始使用
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
