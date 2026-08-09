import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('PaperFix initial entry boundary', () => {
  it('keeps ReducePage eager and moves every non-root page behind dynamic import', () => {
    const app = read('src/App.tsx');

    expect(app).toMatch(/import ReducePage from ['"]\.\/pages\/ReducePage['"]/);
    for (const page of [
      'HomePage',
      'PricingPage',
      'ExamplesPage',
      'FaqPage',
      'PrivacyPage',
      'TermsPage',
      'BlogListPage',
      'BlogArticlePage',
      'PaymentDonePage',
      'DashboardPage',
      'AdminPage',
    ]) {
      expect(app).not.toMatch(new RegExp(`import ${page} from`));
      expect(app).toMatch(new RegExp(`lazy\\(\\(\\) => import\\(['"]\\.\\/pages\\/${page}['"]\\)\\)`));
    }
  });

  it('keeps SEO independent from full article bodies', async () => {
    const seo = read('src/components/SEO.tsx');
    const slugMap = read('src/data/articleSlugMap.ts');

    expect(seo).toMatch(/articleMetadata/);
    expect(seo).not.toMatch(/articleSlugs|data\/articles/);
    expect(slugMap).not.toMatch(/from ['"].*articles/);

    const { articles } = await import('../src/data/articles');
    const { articleMetadata } = await import('../src/data/articleMetadata');
    const { toPublicArticleSlug } = await import('../src/data/articleSlugMap');
    expect(articleMetadata).toHaveLength(articles.length);
    expect(articleMetadata.map((item) => item.internalSlug)).toEqual(articles.map((item) => item.slug));
    expect(articleMetadata).toEqual(articles.map((article) => ({
      internalSlug: article.slug,
      publicSlug: toPublicArticleSlug(article.slug),
      title: article.title,
      description: article.description,
      updatedAt: article.updatedAt,
      faqs: article.faqs,
    })));
  });

  it('loads modal and poller only after user intent', () => {
    const app = read('src/App.tsx');
    const navbar = read('src/components/Navbar.tsx');
    const reduce = read('src/pages/ReducePage.tsx');

    expect(app).not.toMatch(/import LoginModal from/);
    expect(app).toMatch(/DeferredLoginModal/);
    expect(navbar).toMatch(/preloadLoginModal/);
    expect(navbar).toMatch(/onPointerEnter/);
    expect(navbar).toMatch(/onFocus/);
    expect(navbar).toMatch(/onTouchStart/);
    expect(reduce).not.toMatch(/import JobPoller from/);
    expect(reduce).toMatch(/lazy\(\(\) => import\(['"]\.\.\/components\/JobPoller['"]\)\)/);
  });
});
