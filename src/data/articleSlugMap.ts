const publicToInternalSlug: Record<string, string> = {
  'xueshu-gaixie-zhuyishixiang': 'xueshu-gai写-zhuyishixiang',
  'jisuanji-lunwen-gaixie-jishu-shuyu': 'jisuanji-lunwen-gai写-jishu-shuyu',
  'yixue-lunwen-gaixie-anquan': 'yixue-lunwen-gai写-anquan',
  'shuoboshi-lunwen-gaixie-shendu': 'shuoboshi-lunwen-gai写-shendu',
  'jishu-wendang-ai-gaixie': 'jishu-wendang-ai-gai写',
  'lunwen-gaixie-hou-ruhe-fuhe': 'lunwen-gai写-hou-ruhe-fuhe',
};

const internalToPublicSlug = Object.fromEntries(
  Object.entries(publicToInternalSlug).map(([publicSlug, internalSlug]) => [internalSlug, publicSlug]),
) as Record<string, string>;

export function toPublicArticleSlug(slug: string): string {
  return internalToPublicSlug[slug] ?? slug;
}

export function toInternalArticleSlug(slug: string): string {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // Keep malformed URL segments unchanged so callers can return not found.
  }
  return publicToInternalSlug[decoded] ?? decoded;
}
