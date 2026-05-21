import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Clock, Tag } from 'lucide-react';
import { getArticleBySlug, getRelatedArticles } from '../data/articles';

export default function BlogArticlePage() {
  const { slug } = useParams();
  const article = getArticleBySlug(slug);

  if (!article) return <Navigate to="/blog" replace />;

  const relatedArticles = getRelatedArticles(article.slug);

  return (
    <div className="min-h-screen bg-white">
      <article>
        <header className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
          <div className="mx-auto max-w-4xl px-6 py-12">
            <Link to="/blog" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary-600">
              <ArrowLeft size={15} /> 返回专题列表
            </Link>
            <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span className="rounded-full bg-primary-50 px-3 py-1 font-medium text-primary-700">{article.category}</span>
              <span className="flex items-center gap-1"><Clock size={13} /> {article.readTime}</span>
              <span className="flex items-center gap-1"><CalendarDays size={13} /> 更新于 {article.updatedAt}</span>
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-5xl">
              {article.title}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-gray-600">{article.hero}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {article.relatedKeywords.map((keyword) => (
                <span key={keyword} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500">
                  <Tag size={11} /> {keyword}
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1fr_280px]">
          <main className="max-w-3xl">
            <div className="rounded-2xl border border-primary-100 bg-primary-50/50 p-5 text-sm leading-relaxed text-primary-900">
              <strong>阅读提示：</strong>{article.description}
            </div>

            <div className="mt-10 space-y-10">
              {article.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">{section.heading}</h2>
                  <div className="space-y-4 text-[16px] leading-8 text-gray-700">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <section className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <h2 className="text-2xl font-bold text-gray-900">常见问题</h2>
              <div className="mt-6 space-y-5">
                {article.faqs.map((faq) => (
                  <div key={faq.question} className="rounded-xl bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-900">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-7 text-gray-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-12 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 p-8 text-white shadow-lg shadow-primary-100">
              <h2 className="text-2xl font-bold">想先测试一段论文？</h2>
              <p className="mt-3 text-sm leading-7 text-primary-50">
                PaperFix 新用户注册即送 3 次免费体验额度，适合先用摘要、引言或高风险段落测试改写效果。
              </p>
              <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-primary-700 shadow-sm hover:bg-primary-50">
                免费体验 AI论文降重 <ArrowRight size={15} />
              </Link>
            </div>
          </main>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-gray-900">相关推荐</h2>
              <div className="mt-4 space-y-4">
                {relatedArticles.map((related) => (
                  <Link key={related.slug} to={`/blog/${related.slug}`} className="block rounded-xl border border-gray-100 p-4 transition-colors hover:border-primary-100 hover:bg-primary-50/40">
                    <div className="text-xs text-primary-600">{related.category}</div>
                    <div className="mt-1 text-sm font-semibold leading-6 text-gray-900">{related.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}
