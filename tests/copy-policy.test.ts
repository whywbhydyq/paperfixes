import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { normalizePlans } from '../api/admin/index';

const publicFiles = [
  'src/pages/PrivacyPage.tsx',
  'src/pages/FaqPage.tsx',
  'src/pages/HomePage.tsx',
  'src/components/Footer.tsx',
  'src/data/articles.ts',
  'src/pages/PricingPage.tsx',
  'src/pages/PaymentDonePage.tsx',
  'src/pages/TermsPage.tsx',
];
const copy = publicFiles.map((file) => readFileSync(file, 'utf8')).join('\n');

it('contains no false or absolute promises', () => {
  expect(copy).not.toMatch(/不留存(任何)?原文|处理完成后不留存/);
  expect(copy).not.toContain('技术术语零修改');
  expect(copy).not.toMatch(/±\s*5%/);
  expect(copy).not.toContain('额度永久有效');
});

it('states the actual retention and plan expiry behavior', () => {
  expect(copy).toContain('保存用户提交的原文、处理结果和任务记录');
  expect(copy).toContain('付费套餐有效期为 30 天');
  expect(copy).toContain('当前剩余有效期后叠加 30 天');
  expect(copy).toContain('到期后未使用额度清零并恢复免费套餐');
  expect(copy).toContain('单次购买固定增加所选套餐额度，不自动续费');
  expect(copy).toContain('付费有效期内只能再次购买同一套餐');
  expect(copy).toContain('更换套餐需等待当前付费套餐到期');
  expect(copy).not.toContain('确认订阅');
});

it('normalizes every paid plan to one truthful 30-day feature', () => {
  const input = [
    {
      planKey: 'free', name: '免费', price: 0, quota: 3, minChars: 40, maxChars: 500,
      features: ['免费额度'], popular: false, active: true, sortOrder: 0,
    },
    {
      planKey: 'basic', name: '基础', price: 29, quota: 50, minChars: 40, maxChars: 3000,
      features: ['额度永久有效', '30天有效', '30 天有效', '优先队列'],
      popular: true, active: true, sortOrder: 1,
    },
  ];

  const { plans, changed } = normalizePlans(input);
  expect(changed).toBe(true);
  expect(plans[1]).toMatchObject({ price: 29, quota: 50, maxChars: 3000 });
  expect(plans[1].features).toEqual(['优先队列', '30 天有效']);
});
