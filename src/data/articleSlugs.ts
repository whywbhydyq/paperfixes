import { type Article, getArticleBySlug } from './articles';

const publicToInternalSlug: Record<string, string> = {
  'xueshu-gaixie-zhuyishixiang': 'xueshu-gai写-zhuyishixiang',
  'jisuanji-lunwen-gaixie-jishu-shuyu': 'jisuanji-lunwen-gai写-jishu-shuyu',
  'yixue-lunwen-gaixie-anquan': 'yixue-lunwen-gai写-anquan',
  'shuoboshi-lunwen-gaixie-shendu': 'shuoboshi-lunwen-gai写-shendu',
  'jishu-wendang-ai-gaixie': 'jishu-wendang-ai-gai写',
  'lunwen-gaixie-hou-ruhe-fuhe': 'lunwen-gai写-hou-ruhe-fuhe',
};

const internalToPublicSlug = Object.fromEntries(
  Object.entries(publicToInternalSlug).map(([publicSlug, internalSlug]) => [internalSlug, publicSlug])
) as Record<string, string>;

export function getPublicArticleSlug(articleOrSlug: Article | string): string {
  const slug = typeof articleOrSlug === 'string' ? articleOrSlug : articleOrSlug.slug;
  return internalToPublicSlug[slug] ?? slug;
}

export function getArticlePath(articleOrSlug: Article | string): string {
  return `/blog/${getPublicArticleSlug(articleOrSlug)}`;
}

export function getArticleByPublicSlug(slug: string | undefined): Article | undefined {
  if (!slug) return undefined;
  const decodedSlug = decodeURIComponent(slug);
  const internalSlug = publicToInternalSlug[decodedSlug] ?? decodedSlug;
  return getArticleBySlug(internalSlug);
}
