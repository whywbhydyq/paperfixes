import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, Sparkles } from 'lucide-react';

const examples = [
  {
    title: '摘要段落：减少模板化总结',
    scene: '适合本科/硕士论文摘要、引言开头',
    before: '本文首先介绍了相关研究背景，然后分析了当前系统存在的问题，最后提出了一种改进方案。实验结果表明，该方案具有较好的应用价值和推广意义。',
    after: '围绕当前系统在实际使用中暴露出的响应效率与稳定性问题，本文在梳理已有研究的基础上，对关键处理流程进行了重新设计。实验部分从运行时间、结果稳定性和资源占用三个方面进行对比，结果显示，改进后的方案在多数测试场景下表现更稳定。',
    why: ['删除“首先、然后、最后”等过强模板结构', '补充更具体的研究对象和评价维度', '保留学术表达，不把摘要改成口语化内容'],
  },
  {
    title: '技术论文：保护框架名和接口名',
    scene: '适合计算机、软件工程、系统设计类论文',
    before: '系统使用 React 和 Prisma 实现前后端功能，通过 JWT 完成用户认证，并使用 DATABASE_URL 连接数据库。该设计提高了系统安全性。',
    after: '在系统实现层面，前端交互主要由 React 承担，数据访问部分则通过 Prisma 进行统一封装。用户身份校验采用 JWT 机制完成，而数据库连接信息仍通过 DATABASE_URL 进行环境变量管理，从而避免将敏感配置直接写入代码。',
    why: ['React、Prisma、JWT、DATABASE_URL 均保持不变', '把简单总结扩展为实现逻辑说明', '增强“为什么这样设计”的解释性内容'],
  },
  {
    title: '实验分析：加入真实研究语境',
    scene: '适合理工科实验结果、性能对比段落',
    before: '从实验结果可以看出，本文方法优于传统方法，说明本文方法具有较好的性能，在实际应用中具有一定价值。',
    after: '从对比结果来看，本文方法在主要评价指标上整体优于传统方法，尤其是在样本规模增加后，性能下降幅度相对较小。该结果说明，所提出的处理流程在复杂场景下具有更稳定的表现，但在极端输入条件下仍存在进一步优化空间。',
    why: ['避免空泛的“具有较好性能”', '加入评价条件和限制说明', '让结论更符合真实论文写法'],
  },
];

export default function ExamplesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-14 text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700">
            <Sparkles size={15} /> 改写示例库
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">AI论文降重改写示例</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-500">
            通过真实场景示例展示如何降低机器化表达，同时保护专业术语、数据和原文逻辑。建议先参考示例，再提交自己的高风险段落测试。
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
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900"><Sparkles size={15} /> 优化后</div>
                  <p className="rounded-xl bg-green-50/70 p-4 text-sm leading-8 text-gray-700">{example.after}</p>
                </div>
              </div>
              <div className="border-t border-gray-100 bg-white px-6 py-5">
                <div className="mb-3 text-sm font-semibold text-gray-900">为什么这样改？</div>
                <div className="grid gap-2 md:grid-cols-3">
                  {example.why.map((item) => (
                    <div key={item} className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-600">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary-600" /> {item}
                    </div>
                  ))}
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
