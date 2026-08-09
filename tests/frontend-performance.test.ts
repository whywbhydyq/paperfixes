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
});
