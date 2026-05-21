import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Sparkles } from 'lucide-react';

const examples = [
  {
    title: '研究方法段落：保持原意并调整表达结构',
    scene: '真实示例 · 研究方法说明',
    before: '本文采用的研究方法包括：文献研究法，系统梳理协同过滤算法的理论演进与工程应用现状；原型法，基于敏捷开发思路快速搭建系统原型并逐步迭代完善；实证分析法，通过多算法对比实验和压力测试，以量化指标验证系统的推荐效果和性能表现。',
    after: '选用的研究方法如下：文献研究法，即开展协同过滤算法理论演进以及工程应用现状的梳理工作；原型法，基于敏捷开发思路来开展系统原型的搭建并且进行迭代；实证分析法，凭借多算法对比实验与压力测试，运用量化指标对系统的推荐效果与性能表现进行验证。',
  },
  {
    title: '摘要/引言段落：降低模板化表达',
    scene: '真实示例 · 摘要与引言',
    before: '本文首先介绍了相关研究背景，然后分析了当前系统存在的问题，最后提出了一种改进方案。实验结果表明，该方案具有较好的应用价值和推广意义。',
    after: '该文先对相关研究背景开展了介绍工作，接着开展系统现存问题的分析，把改进方案提了出来。由实验结果可见，该方案拥有应用价值以及推广意义。',
  },
  {
    title: '实验分析段落：重构结果说明方式',
    scene: '真实示例 · 实验结果分析',
    before: '从对比结果来看，本文方法在主要评价指标上整体优于传统方法，尤其是在样本规模增加后，性能下降幅度相对较小。该结果说明，所提出的处理流程在复杂场景下具有更稳定的表现，但在极端输入条件下仍存在进一步优化空间。',
    after: '鉴于对比出的结果看，这种方案在主要评价指标上整体高过传统方法，特别是样本规模扩充后，性能下降幅度也相对更小。这个结果反映出，选用的处理流程在复杂场景当中拥有更加稳健的表现，但在极端输入条件下仍有开展进一步优化的空间。',
  },
];

export default function ExamplesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-12 text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700">
            <Sparkles size={15} /> 真实改写示例
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">AI论文降重改写示例</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-500">
            以下示例展示原文与优化结果的真实对照。建议先参考示例，再提交自己的高风险段落测试。
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-8">
          {examples.map((example, index) => (
            <article key={example.title} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 bg-gray-50/60 px-6 py-5">
                <div className="mb-2 text-xs font-semibold text-primary-600">示例 {index + 1} · {example.scene}</div>
                <h2 className="text-2xl font-bold text-gray-900">{example.title}</h2>
              </div>
              <div className="grid gap-0 lg:grid-cols-2">
                <div className="border-b border-gray-100 p-6 lg:border-b-0 lg:border-r">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"><FileText size={15} /> 原文</div>
                  <p className="rounded-xl bg-red-50/60 p-4 text-sm leading-8 text-gray-700">{example.before}</p>
                </div>
                <div className="p-6">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"><Sparkles size={15} /> 优化结果</div>
                  <p className="rounded-xl bg-green-50/70 p-4 text-sm leading-8 text-gray-700">{example.after}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 p-8 text-white shadow-lg shadow-primary-100">
          <h2 className="text-2xl font-bold">想测试你自己的论文段落？</h2>
          <p className="mt-3 text-sm leading-7 text-primary-50">新用户注册即送 3 次免费体验额度，建议先选择摘要、引言或检测报告中的高风险段落。</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-primary-700 shadow-sm hover:bg-primary-50">
            免费测试一段 <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
