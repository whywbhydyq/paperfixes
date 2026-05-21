import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Search, Sparkles } from 'lucide-react';
import { articles } from '../data/articles';
import { getArticlePath } from '../data/articleSlugs';

const categories = Array.from(new Set(articles.map((article) => article.category)));

export default function BlogListPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/80 to-white">
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14 text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700">
            <Sparkles size={15} /> SEO专题与论文AI率优化指南
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
            AI论文降重与AIGC检测优化专题
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-500">
            从检测原理、改写方法、专业场景到工具使用流程，系统整理论文AI率降低、学术改写和表达自然化的实用经验。
          </p>
          <div className="mx-auto mt-8 flex max-w-xl items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm text-gray-400">
            <Search size={18} className="shrink-0" />
            覆盖 AI论文降重、降低AIGC检测率、论文改写、ChatGPT论文检测等长尾问题
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span key={category} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">
              {category}
            </span>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.slug}
              to={getArticlePath(article)}
              className="group flex min-h-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-100 hover:shadow-lg hover:shadow-primary-50"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                  {article.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} /> {article.readTime}
                </span>
              </div>
              <h2 className="text-lg font-bold leading-snug text-gray-900 group-hover:text-primary-700">
                {article.title}
              </h2>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-500">
                {article.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {article.relatedKeywords.slice(0, 3).map((keyword) => (
                  <span key={keyword} className="rounded-md bg-gray-50 px-2 py-1 text-[11px] text-gray-500">
                    {keyword}
                  </span>
                ))}
              </div>
              <div className="mt-auto flex items-center justify-between pt-5 text-sm font-medium text-primary-600">
                <span className="flex items-center gap-1">
                  <BookOpen size={14} /> 阅读专题
                </span>
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
