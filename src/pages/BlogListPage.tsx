import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import { articles } from '../data/articles';
import { getArticlePath } from '../data/articleSlugs';
import { contentInsights, featuredIntentKeywords } from '../data/contentInsights';
import { trackEvent } from '../lib/analytics';

const categories = Array.from(new Set(articles.map((article) => article.category)));
const intentGroups = Array.from(new Set(contentInsights.map((item) => item.intent)));

export default function BlogListPage() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [query, setQuery] = useState('');

  useEffect(() => {
    trackEvent('blog_visit', { article_count: articles.length });
  }, []);

  const filteredArticles = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesCategory = activeCategory === '全部' || article.category === activeCategory;
      const searchable = [
        article.title,
        article.description,
        article.keywords,
        article.category,
        article.relatedKeywords.join(','),
      ].join(' ').toLowerCase();
      const matchesQuery = !keyword || searchable.includes(keyword);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  const resetFilters = () => {
    trackEvent('blog_filter_reset');
    setActiveCategory('全部');
    setQuery('');
  };

  const selectQuery = (keyword: string, source: string) => {
    trackEvent('blog_search_intent_click', { keyword, source });
    setQuery(keyword);
  };

  const selectCategory = (category: string) => {
    trackEvent('blog_category_click', { category });
    setActiveCategory(category);
  };

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
        <section className="mb-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-primary-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <TrendingUp size={16} className="text-primary-600" /> 国内用户常搜问题
            </div>
            <div className="flex flex-wrap gap-2">
              {featuredIntentKeywords.map((keyword) => (
                <button
                  key={keyword}
                  onClick={() => selectQuery(keyword, 'featured_intent')}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 text-sm font-semibold text-gray-900">内容覆盖方向</div>
            <div className="grid grid-cols-2 gap-2">
              {intentGroups.map((intent) => (
                <button
                  key={intent}
                  onClick={() => selectQuery(intent, 'intent_group')}
                  className="rounded-xl bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
                >
                  {intent}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onBlur={() => query.trim() && trackEvent('blog_search', { query: query.trim(), result_count: filteredArticles.length })}
                placeholder="搜索：AI论文降重、AIGC检测、ChatGPT论文检测..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-10 text-sm outline-none transition-colors focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="清空搜索"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="text-sm text-gray-500">
              共 <span className="font-semibold text-primary-600">{filteredArticles.length}</span> 篇专题
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {['全部', ...categories].map((category) => (
              <button
                key={category}
                onClick={() => selectCategory(category)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === category
                    ? 'border-primary-200 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
              <Search size={24} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">没有找到匹配专题</h2>
            <p className="mt-2 text-sm text-gray-500">换个关键词试试，例如“论文AI率”“免费降重”“AIGC检测”。</p>
            <button onClick={resetFilters} className="mt-5 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
              查看全部专题
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article) => (
              <Link
                key={article.slug}
                to={getArticlePath(article)}
                onClick={() => trackEvent('blog_article_click', { slug: article.slug, category: article.category, source: 'blog_list' })}
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
        )}
      </div>
    </div>
  );
}
