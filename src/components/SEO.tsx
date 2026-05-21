import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getArticleBySlug } from '../data/articles';

const SITE_URL = 'https://www.paperfixes.com';
const SITE_NAME = 'PaperFix';

type SeoConfig = {
  title: string;
  description: string;
  keywords: string;
  path: string;
  robots?: string;
  jsonLd?: Record<string, unknown>[];
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
};

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'PaperFix AI论文降重工具',
  applicationCategory: 'WritingApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description: 'PaperFix 是面向论文和技术文档的学术改写工具，支持降低AIGC检测率、优化机器化表达，并保护技术术语不被破坏。',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'CNY',
    description: '新用户注册即送3次免费体验额度',
  },
};

const routeSeo: Record<string, SeoConfig> = {
  '/': {
    title: 'AI论文降重工具 - 降低AIGC检测率与机器化表达 | PaperFix',
    description: 'PaperFix 是面向论文和技术文档的学术改写工具，支持降低AIGC检测率、优化机器化表达、保护技术术语不被破坏。新用户注册即送3次免费体验。',
    keywords: 'AI论文降重,降低AIGC检测率,论文AI率降低,学术改写,论文改写工具,AI降重工具,降低AI检测率',
    path: '/',
    jsonLd: [organizationJsonLd, softwareJsonLd],
  },
  '/home': {
    title: 'PaperFix 学术改写引擎 - 优化论文表达与AI检测痕迹',
    description: 'PaperFix 专注学术文本改写，通过句式重构、表达优化和术语保护，帮助论文和技术文档降低机器化表达，提高文本自然度。',
    keywords: 'PaperFix,学术改写引擎,论文表达优化,技术文档改写,AI文本优化,论文润色改写',
    path: '/home',
    jsonLd: [organizationJsonLd, softwareJsonLd],
  },
  '/pricing': {
    title: 'PaperFix 定价 - AI论文降重与学术改写套餐',
    description: '查看 PaperFix 学术改写套餐价格，支持免费体验、基础套餐和专业套餐。按需购买改写额度，处理失败自动退还。',
    keywords: 'PaperFix定价,AI降重价格,论文改写套餐,AIGC检测率降低工具,学术改写价格',
    path: '/pricing',
    jsonLd: [organizationJsonLd, softwareJsonLd],
  },
  '/blog': {
    title: 'AI论文降重与AIGC检测优化专题 | PaperFix 学术改写指南',
    description: 'PaperFix 专题库系统整理AI论文降重、降低AIGC检测率、论文AI率优化、ChatGPT论文检测和学术改写技巧。',
    keywords: 'AI论文降重专题,AIGC检测优化,论文AI率降低,论文改写指南,学术改写教程',
    path: '/blog',
    jsonLd: [organizationJsonLd, softwareJsonLd],
  },
  '/dashboard': {
    title: '用户中心 | PaperFix',
    description: 'PaperFix 用户中心，用于查看额度、改写记录和充值记录。',
    keywords: 'PaperFix用户中心',
    path: '/dashboard',
    robots: 'noindex,nofollow',
  },
  '/admin': {
    title: '管理控制台 | PaperFix',
    description: 'PaperFix 管理控制台。',
    keywords: 'PaperFix管理后台',
    path: '/admin',
    robots: 'noindex,nofollow',
  },
  '/payment/done': {
    title: '支付结果 | PaperFix',
    description: 'PaperFix 支付结果页。',
    keywords: 'PaperFix支付结果',
    path: '/payment/done',
    robots: 'noindex,nofollow',
  },
};

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    document.head.appendChild(tag);
  }
  Object.entries(attrs).forEach(([key, value]) => tag!.setAttribute(key, value));
}

function upsertLink(selector: string, attrs: Record<string, string>) {
  let tag = document.head.querySelector<HTMLLinkElement>(selector);
  if (!tag) {
    tag = document.createElement('link');
    document.head.appendChild(tag);
  }
  Object.entries(attrs).forEach(([key, value]) => tag!.setAttribute(key, value));
}

function updateJsonLd(items: Record<string, unknown>[] = []) {
  document.head.querySelectorAll('script[data-paperfix-seo="jsonld"]').forEach((node) => node.remove());

  items.forEach((item) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-paperfix-seo', 'jsonld');
    script.textContent = JSON.stringify(item);
    document.head.appendChild(script);
  });
}

function getBlogSeo(pathname: string): SeoConfig | null {
  const match = pathname.match(/^\/blog\/([^/]+)$/);
  if (!match) return null;
  const article = getArticleBySlug(decodeURIComponent(match[1]));
  if (!article) return null;

  const url = `${SITE_URL}/blog/${article.slug}`;
  return {
    title: `${article.title} | PaperFix`,
    description: article.description,
    keywords: article.keywords,
    path: `/blog/${article.slug}`,
    jsonLd: [
      organizationJsonLd,
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.description,
        url,
        dateModified: article.updatedAt,
        datePublished: article.updatedAt,
        author: { '@type': 'Organization', name: SITE_NAME },
        publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` } },
        mainEntityOfPage: url,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: article.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      },
    ],
  };
}

function getSeoConfig(pathname: string): SeoConfig {
  const blogSeo = getBlogSeo(pathname);
  if (blogSeo) return blogSeo;

  return routeSeo[pathname] ?? {
    title: 'PaperFix - AI论文降重与学术改写工具',
    description: 'PaperFix 提供学术文本改写、论文表达优化和AI检测痕迹优化服务，帮助论文和技术文档表达更自然。',
    keywords: 'PaperFix,AI论文降重,学术改写,论文改写工具',
    path: pathname,
  };
}

export default function SEO() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = getSeoConfig(pathname);
    const canonicalUrl = `${SITE_URL}${seo.path === '/' ? '/' : seo.path}`;
    const robots = seo.robots ?? 'index,follow';

    document.documentElement.lang = 'zh-CN';
    document.title = seo.title;

    upsertMeta('meta[name="description"]', { name: 'description', content: seo.description });
    upsertMeta('meta[name="keywords"]', { name: 'keywords', content: seo.keywords });
    upsertMeta('meta[name="robots"]', { name: 'robots', content: robots });
    upsertMeta('meta[name="author"]', { name: 'author', content: SITE_NAME });

    upsertLink('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl });

    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: seo.title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: seo.description });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'zh_CN' });

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seo.description });

    updateJsonLd(seo.jsonLd);
  }, [pathname]);

  return null;
}
