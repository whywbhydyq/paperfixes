import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-24 text-white">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 30% 50%, rgba(99,102,241,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(16,185,129,0.2) 0%, transparent 50%)'}} />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-primary-300 backdrop-blur">
            <Zap size={14} /> 专业学术改写工具
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            让每一篇论文<br />
            <span className="bg-gradient-to-r from-primary-400 to-emerald-400 bg-clip-text text-transparent">安全通过AIGC检测</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-300">
            基于海量学术语料训练的智能改写引擎，深度重构句式结构与表达逻辑，精准降低AI检测率，同时完整保留技术术语与核心语义。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-500 hover:shadow-xl active:scale-[0.97]"
            >
              立即使用 <ArrowRight size={16} />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/10"
            >
              查看定价
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
            <div className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-green-400" /> 术语零破坏</div>
            <div className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-green-400" /> 字数严格控制</div>
            <div className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-green-400" /> 隐私安全保障</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">三大核心引擎，全面升级</h2>
            <p className="mt-3 text-gray-500">从数据源到算法模型再到比对引擎，每一层都经过深度优化</p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <div className="group rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/50 p-8 transition-all hover:border-primary-100 hover:shadow-lg hover:shadow-primary-50">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                <FileText size={22} />
              </div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">数据引擎升级</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                对接数亿级学术文献资源库，涵盖期刊论文、学位论文、专利文献及学术著作等多类型数据源，构建超大规模语义特征空间，确保改写结果具备真实学术表达特征。
              </p>
            </div>

            <div className="group rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/50 p-8 transition-all hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-50">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <Zap size={22} />
              </div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">算法引擎升级</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                采用自研深度语义变换网络，融合多层注意力机制与上下文感知技术，在保持原文语义完整性的前提下，实现表达层面的深度重构，有效规避AI文本指纹识别。
              </p>
            </div>

            <div className="group rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/50 p-8 transition-all hover:border-amber-100 hover:shadow-lg hover:shadow-amber-50">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                <ShieldCheck size={22} />
              </div>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">比对引擎升级</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                基于分布式计算架构实现高并发检索与实时比对，结合自然语言处理技术深入分析文本结构与用词模式，精准定位AI生成痕迹并针对性优化，显著提升改写通过率。
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
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white shadow-lg shadow-primary-200">1</div>
              <h3 className="mb-2 font-semibold text-gray-900">粘贴文本</h3>
              <p className="text-sm text-gray-500">将需要降重的论文段落粘贴到输入框，支持批量处理</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white shadow-lg shadow-primary-200">2</div>
              <h3 className="mb-2 font-semibold text-gray-900">智能改写</h3>
              <p className="text-sm text-gray-500">引擎自动执行多策略语义重构，通常10-30秒完成</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-xl font-bold text-white shadow-lg shadow-primary-200">3</div>
              <h3 className="mb-2 font-semibold text-gray-900">获取结果</h3>
              <p className="text-sm text-gray-500">改写完成即时显示，处理完成后不留存任何原文</p>
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
                '技术专有名词保留',
                '输出字数控制在原文±5%以内',
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
                立即开始使用 <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
