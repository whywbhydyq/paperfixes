import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const implementationFiles = [
  'api/payment/create.ts',
  'api/payment/notify.ts',
  'api/payment/status.ts',
  'shared/payment-maintenance.ts',
  'src/pages/PricingPage.tsx',
  'src/pages/PaymentDonePage.tsx',
  'src/lib/api.ts',
  'docs/payment/redemption-code-foundation.md',
];

it('keeps the active payment and voucher foundation provider-neutral', () => {
  const activeImplementation = implementationFiles
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

  expect(activeImplementation).not.toMatch(/爱发电|afdian/i);
  expect(activeImplementation).not.toMatch(/alipay|wxpay|支付宝|微信支付/i);
});

it('documents the future provider adapter without claiming a live integration', () => {
  const foundation = readFileSync('docs/payment/redemption-code-foundation.md', 'utf8');

  expect(foundation).toContain('当前未接通任何线上支付提供商');
  expect(foundation).toContain('未来支付提供商适配边界');
  expect(foundation).toContain('finalizePaidOrder');
  expect(foundation).toContain('不得由提供商适配器直接修改用户额度');
});

it('keeps the rejected branded proposal inside an explicitly retired archive', () => {
  const decisionRecord = readFileSync(
    'docs/payment/2026-08-09-individual-payment-replacement.md',
    'utf8',
  );
  const archiveStart = decisionRecord.indexOf('<details>');
  const archiveEnd = decisionRecord.lastIndexOf('</details>');

  expect(decisionRecord.slice(0, archiveStart))
    .toContain('爱发电路线已排除，不再推荐或实施');
  expect(archiveStart).toBeGreaterThan(-1);
  expect(archiveEnd).toBeGreaterThan(archiveStart);
  expect(decisionRecord.slice(archiveStart, archiveEnd)).toContain('爱发电');
});
