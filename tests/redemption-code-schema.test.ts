import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const migrationPath =
  'prisma/migrations/20260810000000_add_redemption_codes/migration.sql';

it('adds a redemption-code table without destructive database statements', () => {
  expect(existsSync(migrationPath)).toBe(true);

  const schema = readFileSync('prisma/schema.prisma', 'utf8');
  const migration = readFileSync(migrationPath, 'utf8');

  expect(schema).toContain('model RedemptionCode');
  expect(schema).toContain('codeHash');
  expect(schema).not.toMatch(/model RedemptionCode[\s\S]*?\n\s*code\s+String/);
  expect(migration).toContain('CREATE TABLE IF NOT EXISTS "RedemptionCode"');
  expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "RedemptionCode_codeHash_key"');
  expect(migration).not.toMatch(/^\s*(?:DROP\b|DELETE\s+FROM\b|TRUNCATE\b)/im);
});
