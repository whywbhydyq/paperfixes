import { Link } from 'react-router-dom';
import { ArrowRight, HelpCircle } from 'lucide-react';

const faqs = [
  { q: 'PaperFix 免费几次？', a: '新用户注册即送 3 次免费体验额度，适合先用摘要、引言或检测报告中的高风险段落测试效果。' },
  { q: '会保存我的论文原文吗？', a: 'PaperFix 的产品定位是处理完成后不留存任何原文。为了安全起见，也建议你不要提交包含个人隐私、未公开数据或敏感项目信息的内容。' },
  { q: '能保证 AIGC 检测一定通过吗？', a: '不能承诺“保证通过”。不同检测平台的模型、阈值和样本库不同，结果会有差异。PaperFix 的目标是降低机器化表达特征，并提供更适合人工复核的改写结果。' },
  { q: '适合本科、硕士论文吗？', a: '适合处理摘要、引言、文献综述、结论展望等容易出现模板化表达的段落。硕博论文建议分章节、分段处理，并对方法和实验部分重点复核。' },
  { q: '适合医学、计算机、理工科论文吗？', a: '可以使用，但要特别关注术语保护。医学论文需保护疾病名、药物名、指标和结论；计算机论文需保护框架名、代码名、API、变量名等。' },
  { q: '改写失败会扣额度吗？', a: '项目设计中包含失败自动退还额度的机制。若改写任务失败，额度应自动返还。' },
  { q: 'AI降重和论文润色有什么区别？', a: 'AI降重更关注降低重复表达和机器化特征；论文润色更关注语法、流畅度和表达质量。两者可以配合使用，但不能混为一谈。' },
  { q: '改写后可以直接提交吗？', a: '不建议。改写结果应作为辅助材料，最终仍需作者逐段复核原意、术语、数据、引用和段落衔接。' },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-14 text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700">
            <HelpCircle size={15} /> 常见问题
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">PaperFix 使用常见问题</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-500">关于免费额度、隐私安全、AIGC检测率、学术诚信和使用流程的集中说明。</p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="space-y-4">
          {faqs.map((faq) => (
            <section key={faq.q} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">{faq.q}</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">{faq.a}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-primary-50 p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900">还有疑问？先用免费额度测试一段</h2>
          <p className="mt-2 text-sm text-gray-500">测试真实段落，比只看说明更能判断是否适合你的论文。</p>
          <Link to="/" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700">
            开始免费体验 <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
