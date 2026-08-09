# PaperFix First-Load Code Splitting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the PaperFix rewrite editor in the synchronous root path while moving unrelated routes, blog bodies, login UI, and polling UI out of the initial JavaScript payload.

**Architecture:** React Router routes other than `/` become `React.lazy` boundaries, and conditionally used components are loaded through explicit preloadable module functions. SEO consumes a compact article-metadata module instead of importing article bodies; a build-manifest budget checker proves the initial static import graph remains below 250 KB.

**Tech Stack:** React 19, React Router 7, TypeScript, Vite 7, Vitest, Node.js build-manifest inspection.

## Global Constraints

- `ReducePage` remains a static import and the `/` route never shows a route-level loading fallback.
- Initial JavaScript static dependency closure must remain below 250,000 raw bytes.
- Blog bodies must not be part of the `index.html` entry chunk or its static imports.
- Authentication, HttpOnly cookie sessions, plan entitlement behavior, 30-day expiry stacking, database history, payment settlement, and refund behavior must not change.
- Character-limit defaults render synchronously; the admin-config fetch remains a non-blocking correction.
- No new production dependency is allowed.

---

### Task 1: Lock the entry-boundary contract with failing tests

**Files:**
- Create: `tests/frontend-performance.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Root route consumes the statically imported `ReducePage`.
- Non-root pages are assigned to constants created by `lazy(() => import(...))`.

- [ ] **Step 1: Write the failing source contract**

```ts
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');

describe('PaperFix initial entry boundary', () => {
  it('keeps ReducePage eager and moves every non-root page behind dynamic import', () => {
    expect(app).toMatch(/import ReducePage from ['"]\.\/pages\/ReducePage['"]/);
    for (const page of ['HomePage', 'PricingPage', 'ExamplesPage', 'FaqPage', 'PrivacyPage', 'TermsPage', 'BlogListPage', 'BlogArticlePage', 'PaymentDonePage', 'DashboardPage', 'AdminPage']) {
      expect(app).not.toMatch(new RegExp(`import ${page} from`));
      expect(app).toMatch(new RegExp(`lazy\\(\\(\\) => import\\(['\"]\\.\\/pages\\/${page}['\"]\\)\\)`));
    }
  });
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/frontend-performance.test.ts`  
Expected: FAIL because all pages are statically imported.

- [ ] **Step 3: Introduce lazy routes without wrapping `/`**

In `src/App.tsx`:

```tsx
import { lazy, Suspense, useEffect } from 'react';
import ReducePage from './pages/ReducePage';

const HomePage = lazy(() => import('./pages/HomePage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
// Repeat for every non-root page listed by the test.

function RouteFallback() {
  return <div role="status" aria-live="polite" className="mx-auto max-w-6xl px-6 py-16 text-sm text-gray-500">页面加载中…</div>;
}
```

Keep `<Route path="/" element={<ReducePage />} />` outside a fallback component. Wrap only each non-root element with a small `LazyRoute` component returning `<Suspense fallback={<RouteFallback />}>{children}</Suspense>`.

- [ ] **Step 4: Run the focused test and typecheck**

Run: `npm test -- tests/frontend-performance.test.ts && npm run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx tests/frontend-performance.test.ts
git commit -m "perf: split non-root PaperFix routes"
```

### Task 2: Remove blog bodies from the root SEO dependency graph

**Files:**
- Create: `src/data/articleMetadata.ts`
- Create: `src/data/articleSlugMap.ts`
- Modify: `src/data/articleSlugs.ts`
- Modify: `src/components/SEO.tsx`
- Modify: `tests/frontend-performance.test.ts`

**Interfaces:**
- `articleSlugMap.ts` produces `toPublicArticleSlug(slug: string): string` and `toInternalArticleSlug(slug: string): string` without importing `articles.ts`.
- `articleMetadata.ts` produces `ArticleMetadata`, `articleMetadata`, and `getArticleMetadataByPublicSlug(slug?: string)`.
- `articleSlugs.ts` remains the article-body helper used only by lazy blog routes.

- [ ] **Step 1: Add failing metadata-isolation tests**

```ts
it('keeps SEO independent from full article bodies', async () => {
  const seo = fs.readFileSync(path.join(root, 'src/components/SEO.tsx'), 'utf8');
  const slugMap = fs.readFileSync(path.join(root, 'src/data/articleSlugMap.ts'), 'utf8');
  expect(seo).toMatch(/articleMetadata/);
  expect(seo).not.toMatch(/articleSlugs|data\/articles/);
  expect(slugMap).not.toMatch(/from ['"].*articles/);

  const { articles } = await import('../src/data/articles');
  const { articleMetadata } = await import('../src/data/articleMetadata');
  expect(articleMetadata).toHaveLength(articles.length);
  expect(articleMetadata.map((item) => item.internalSlug)).toEqual(articles.map((item) => item.slug));
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/frontend-performance.test.ts`  
Expected: FAIL because metadata and slug-map modules do not exist and SEO imports `articleSlugs.ts`.

- [ ] **Step 3: Split slug conversion from article lookup**

Move the current public/internal mapping to `articleSlugMap.ts`:

```ts
export function toPublicArticleSlug(slug: string): string {
  return internalToPublicSlug[slug] ?? slug;
}

export function toInternalArticleSlug(slug: string): string {
  const decoded = decodeURIComponent(slug);
  return publicToInternalSlug[decoded] ?? decoded;
}
```

Update `articleSlugs.ts` to import these functions and preserve `getArticlePath`, `getPublicArticleSlug`, and `getArticleByPublicSlug` for blog pages.

- [ ] **Step 4: Add compact metadata and switch SEO**

For each of the 24 articles, store only:

```ts
export interface ArticleMetadata {
  internalSlug: string;
  publicSlug: string;
  title: string;
  description: string;
  updatedAt: string;
  faqs: Array<{ question: string; answer: string }>;
}
```

Update `SEO.tsx` to call `getArticleMetadataByPublicSlug`, use `publicSlug` directly, and build the existing Article/Breadcrumb/FAQ JSON-LD without importing article sections.

- [ ] **Step 5: Run tests, typecheck, and commit**

Run: `npm test -- tests/frontend-performance.test.ts && npm run typecheck`  
Expected: PASS and all 24 metadata rows match article slugs.

```bash
git add src/data/articleMetadata.ts src/data/articleSlugMap.ts src/data/articleSlugs.ts src/components/SEO.tsx tests/frontend-performance.test.ts
git commit -m "perf: isolate blog metadata from article bodies"
```

### Task 3: Lazy-load login and polling UI only when needed

**Files:**
- Create: `src/components/lazyLoginModal.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Navbar.tsx`
- Modify: `src/pages/ReducePage.tsx`
- Modify: `tests/frontend-performance.test.ts`

**Interfaces:**
- `lazyLoginModal.tsx` exports `preloadLoginModal(): Promise<unknown>` and `DeferredLoginModal(): JSX.Element | null`.
- `ReducePage` dynamically imports `JobPoller` only when `phase === 'processing'`.

- [ ] **Step 1: Add failing conditional-import tests**

```ts
it('loads modal and poller only after user intent', () => {
  const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
  const navbar = fs.readFileSync(path.join(root, 'src/components/Navbar.tsx'), 'utf8');
  const reduce = fs.readFileSync(path.join(root, 'src/pages/ReducePage.tsx'), 'utf8');
  expect(app).not.toMatch(/import LoginModal from/);
  expect(navbar).toMatch(/preloadLoginModal/);
  expect(reduce).not.toMatch(/import JobPoller from/);
  expect(reduce).toMatch(/lazy\(\(\) => import\(['"]\.\.\/components\/JobPoller['"]\)\)/);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/frontend-performance.test.ts`  
Expected: FAIL because LoginModal and JobPoller are static imports.

- [ ] **Step 3: Implement the preloadable login boundary**

```tsx
import { lazy, Suspense } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const loadLoginModal = () => import('./LoginModal');
const LoginModal = lazy(loadLoginModal);
export const preloadLoginModal = () => loadLoginModal();

export function DeferredLoginModal() {
  const open = useAuthStore((state) => state.showLoginModal);
  if (!open) return null;
  return <Suspense fallback={null}><LoginModal /></Suspense>;
}
```

Use `<DeferredLoginModal />` in App. Add `onPointerEnter`, `onFocus`, and `onTouchStart` to login/trial controls in Navbar, each invoking `preloadLoginModal` without preventing the existing click behavior.

- [ ] **Step 4: Lazy-load JobPoller at the processing boundary**

Replace the static import with:

```tsx
const JobPoller = lazy(() => import('../components/JobPoller'));
```

Wrap only the `phase === 'processing'` branch in `<Suspense>` using the existing processing card as a stable-height fallback. Input and output editor branches remain synchronous.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- tests/frontend-performance.test.ts && npm run typecheck`  
Expected: PASS.

```bash
git add src/components/lazyLoginModal.tsx src/App.tsx src/components/Navbar.tsx src/pages/ReducePage.tsx tests/frontend-performance.test.ts
git commit -m "perf: defer conditional PaperFix UI"
```

### Task 4: Enforce the 250 KB initial JavaScript budget from Vite output

**Files:**
- Create: `scripts/check-performance-budget.mjs`
- Modify: `vite.config.ts`
- Modify: `package.json`
- Modify: `tests/frontend-performance.test.ts`

**Interfaces:**
- Vite produces `dist/.vite/manifest.json`.
- Budget checker follows only `imports` from the `index.html` entry; it excludes `dynamicImports` and fails above 250,000 bytes.

- [ ] **Step 1: Add a failing build-budget contract test**

```ts
it('exposes a build performance-budget command and Vite manifest', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const vite = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
  expect(pkg.scripts['perf:check']).toBe('node scripts/check-performance-budget.mjs');
  expect(vite).toMatch(/manifest:\s*true/);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/frontend-performance.test.ts`  
Expected: FAIL because the script and manifest setting are absent.

- [ ] **Step 3: Implement manifest output and recursive static-import accounting**

Set `build: { manifest: true }` in `vite.config.ts`. The checker must:

```js
const manifest = JSON.parse(await fs.readFile('dist/.vite/manifest.json', 'utf8'));
const entry = Object.values(manifest).find((item) => item.isEntry && item.src === 'index.html');
const visited = new Set();
function collect(key) {
  if (visited.has(key)) return;
  visited.add(key);
  for (const imported of manifest[key]?.imports || []) collect(imported);
}
collect(Object.keys(manifest).find((key) => manifest[key] === entry));
const bytes = [...visited].reduce((sum, key) => sum + statSync(path.join('dist', manifest[key].file)).size, 0);
if (bytes >= 250_000) process.exitCode = 1;
```

Also assert at least one dynamic route chunk and a blog/articles chunk exist, and scan initial files to ensure a unique long article-body marker is absent.

- [ ] **Step 4: Add commands and run build budget**

Add:

```json
"perf:check": "node scripts/check-performance-budget.mjs",
"verify": "npm test && npm run typecheck && npm run build && npm run perf:check"
```

Run: `npm run build && npm run perf:check`  
Expected: PASS with reported initial raw JavaScript below 250,000 bytes and blog chunks listed as dynamic.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-performance-budget.mjs vite.config.ts package.json tests/frontend-performance.test.ts
git commit -m "test: enforce PaperFix initial bundle budget"
```

### Task 5: Verify UI behavior and protected business invariants

**Files:**
- Modify only files from Tasks 1-4 if verification reveals defects.

**Interfaces:**
- No new interface; this task proves the performance change did not alter product or security behavior.

- [ ] **Step 1: Run the full automated suite fresh**

Run: `npm run verify`  
Expected: all Vitest files pass, TypeScript emits no errors, Vite build exits 0, and the performance budget exits 0.

- [ ] **Step 2: Re-run database and security invariants explicitly**

Run:

```powershell
npx vitest run tests/plan-entitlements.test.ts tests/auth-session.test.ts tests/http-security.test.ts tests/order-settlement.test.ts tests/job-refund.test.ts tests/copy-policy.test.ts
```

Expected: every named test passes; no snapshot or expectation changes are needed.

- [ ] **Step 3: Browser-test first load and lazy transitions**

Start `npm run dev`. On desktop and mobile widths verify:

- `/` displays and accepts text without a route fallback.
- Sample text, file input, character count, empty/short/over-limit validation, and login opening work.
- Login prefetch produces no console error and clicking still opens the modal.
- `/pricing`, `/examples`, `/blog`, one blog article, `/dashboard`, and an unknown route render a visible page or existing intended result after their lazy chunk loads.
- A processing-state fixture loads JobPoller without collapsing the editor layout.

- [ ] **Step 4: Capture resource and timing evidence**

Record entry raw bytes from `npm run perf:check`, plus browser FCP, LCP, DOM Interactive, request count, and transferred JavaScript for `/`. Confirm the editor remains the first main interactive surface and CLS remains near zero.

- [ ] **Step 5: Review final diff and commit verification fixes**

Run: `git diff --check && git status --short && git log -8 --oneline`  
Expected: no whitespace errors, no generated secrets, and no API/database file changes outside the protected scope.

If fixes were necessary:

```bash
git add <only-verified-fix-files>
git commit -m "fix: close PaperFix performance verification gaps"
```
