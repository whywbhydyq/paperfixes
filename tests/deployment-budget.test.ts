import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function listServerlessFunctions(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '_lib' ? [] : listServerlessFunctions(path);
    }
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
}

describe('Vercel Hobby deployment budget', () => {
  it('keeps no more than 12 functions while preserving the logout URL', () => {
    const functions = listServerlessFunctions('api');
    expect(functions).toHaveLength(12);

    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
    expect(config.rewrites).toContainEqual({
      source: '/api/auth/logout',
      destination: '/api/auth/phone-login?operation=logout',
    });
  });
});
