import { type Article, getArticleBySlug } from './articles';
import { toInternalArticleSlug, toPublicArticleSlug } from './articleSlugMap';

export function getPublicArticleSlug(articleOrSlug: Article | string): string {
  const slug = typeof articleOrSlug === 'string' ? articleOrSlug : articleOrSlug.slug;
  return toPublicArticleSlug(slug);
}

export function getArticlePath(articleOrSlug: Article | string): string {
  return `/blog/${getPublicArticleSlug(articleOrSlug)}`;
}

export function getArticleByPublicSlug(slug: string | undefined): Article | undefined {
  if (!slug) return undefined;
  return getArticleBySlug(toInternalArticleSlug(slug));
}
