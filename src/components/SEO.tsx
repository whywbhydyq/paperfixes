import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getArticleMetadataByPublicSlug } from '../data/articleMetadata';

const SITE_URL = 'https://www.paperfixes.com';
const SITE_NAME = 'PaperFix';

type SeoConfig = {
  title: string;
  description: string;
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
  '@type': ['SoftwareApplication', 'WebApplication'],
  name: 'PaperFix AI论文降重与学术表达优化工具',
  applicationCategory: 'WritingApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description: 'PaperFix 是面向论文和技术文档的学术表达优化工具，支持句式重构、机器化表达优化、术语保护和人工复核辅助。',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'CNY',
    description: '新用户注册即送3次免费体验额度',
  },
};

const routeSeo: Record<string, SeoConfig> = {
  '/': {
    title: 'AI论文降重与学术表达优化工具 - 免费试用 | PaperFix',
    description: 'PaperFix 面向论文和技术文档，提供学术表达优化、句式重构、术语保护与字数控制。新用户可免费试用3次；结果仅作写作辅助，请人工复核原意、数据、引用和术语。',
    path: '/',
    jsonLd: [organizationJsonLd, softwareJsonLd],
  },
  '/home': {
    title: 'PaperFix 学术表达优化工具 - AI论文降重与人工复核辅助',
    description: 'PaperFix 专注论文和技术文档表达优化，通过句式重构、术语保护和字数控制，帮助作者降低模板化表达。结果仅供写作辅助，提交前请人工复核。',
    path: '/home',
    jsonLd: [organizationJsonLd, softwareJsonLd],
  },
  '/pricing': {
    title: 'PaperFix 定价 - AI论文降重与学术表达优化套餐',
    description: '查看 PaperFix 学术表达优化套餐价格，支持免费体验、基础套餐和专业套餐。按需购买改写额度，处理失败自动退还。',
    path: '/pricing',
    jsonLd: [organizationJsonLd, softwareJsonLd],
  },
  '/examples': {
    title: 'AI论文降重改写示例 - 摘要、技术论文与实验分析 | PaperFix',
    description: '查看 PaperFix AI论文降重改写示例，了解如何优化机器化表达、保护技术术语，并通过真实场景复核改写效果。',
    path: '/examples',
    jsonLd: [organizationJsonLd, softwareJsonLd],
  },
  '/faq': {
    title: 'PaperFix 常见问题 - 免费额度、隐私安全与AIGC检测说明',
    description: '了解 PaperFix 免费体验次数、论文原文处理方式、AIGC检测说明、失败退还额度和学术诚信使用边界。',
    path: '/faq',
    jsonLd: [organizationJsonLd, softwareJsonLd],
  },
  '/privacy': {
    title: '隐私政策 | PaperFix',
    description: 'PaperFix 隐私政策，说明账号信息、论文文本、第三方服务和数据安全处理方式。',
    path: '/privacy',
    jsonLd: [organizationJsonLd],
  },
  '/terms': {
    title: '服务条款 | PaperFix',
    description: 'PaperFix 服务条款，说明服务性质、学术诚信、检测结果、额度支付和禁止行为。',
    path: '/terms',
    jsonLd: [organizationJsonLd],
  },
  '/blog': {
    title: 'AI论文降重与AIGC检测优化专题 | PaperFix 学术改写指南',
    description: 'PaperFix 专题库系统整理AI论文降重、AIGC检测说明、论文AI率优化、ChatGPT论文检测和学术表达优化技巧。',
    path: '/blog',
    jsonLd: [organizationJsonLd, softwareJsonLd],
  },
  '/dashboard': {
    title: '用户中心 | PaperFix',
    description: 'PaperFix 用户中心，用于查看额度、改写记录和充值记录。',
    path: '/dashboard',
    robots: 'noindex,nofollow',
  },
  '/admin': {
    title: '管理控制台 | PaperFix',
    description: 'PaperFix 管理控制台。',
    path: '/admin',
    robots: 'noindex,nofollow',
  },
  '/payment/done': {
    title: '支付结果 | PaperFix',
    description: 'PaperFix 支付结果页。',
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
  const article = getArticleMetadataByPublicSlug(match[1]);
  if (!article) return null;

  const publicSlug = article.publicSlug;
  const url = `${SITE_URL}/blog/${publicSlug}`;
  return {
    title: `${article.title} | PaperFix`,
    description: article.description,
    path: `/blog/${publicSlug}`,
    jsonLd: [
      organizationJsonLd,
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: '专题指南', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: article.title, item: url },
        ],
      },
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
    title: 'PaperFix - AI论文降重与学术表达优化工具',
    description: 'PaperFix 提供学术文本改写、论文表达优化和AI检测痕迹优化服务，帮助论文和技术文档表达更自然。结果仅供写作辅助，请人工复核。',
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
