import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { selectPersistedAuthState } from '../src/store/useAuthStore';

const projectRoot = resolve(import.meta.dirname, '..');

function readSourceFiles(directory: string): Array<{ path: string; source: string }> {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return readSourceFiles(path);
    if (!/\.(?:ts|tsx)$/.test(path)) return [];
    return [{ path: relative(projectRoot, path), source: readFileSync(path, 'utf8') }];
  });
}

describe('browser auth persistence', () => {
  const user = {
    id: 'user-1',
    role: 'USER',
    plan: 'basic',
    quota: 12_000,
    totalUsed: 300,
    planExpiresAt: '2026-09-08T00:00:00.000Z',
  };

  it('persists only the authenticated user and a minimal processing-job pointer', () => {
    const persisted = selectPersistedAuthState({
      user,
      isLoggedIn: true,
      activeJob: {
        jobId: 'job-1',
        phase: 'processing',
        result: 'sensitive result',
        inputLen: 123,
        outputLen: 119,
      },
      inputText: 'sensitive original text',
      token: 'legacy-token',
      planActivatedAt: '2026-08-01T00:00:00.000Z',
    });

    expect(persisted).toEqual({
      user,
      isLoggedIn: true,
      activeJob: { jobId: 'job-1', phase: 'processing' },
    });
    expect(JSON.stringify(persisted)).not.toContain('sensitive');
    expect(JSON.stringify(persisted)).not.toContain('legacy-token');
    expect(persisted).not.toHaveProperty('inputText');
    expect(persisted).not.toHaveProperty('planActivatedAt');
  });

  it('does not persist completed job output', () => {
    const persisted = selectPersistedAuthState({
      user,
      isLoggedIn: true,
      activeJob: {
        jobId: 'job-2',
        phase: 'done',
        result: 'completed sensitive result',
      },
      inputText: 'completed sensitive input',
    });

    expect(persisted.activeJob).toBeNull();
    expect(JSON.stringify(persisted)).not.toContain('sensitive');
  });

  it('keeps bearer tokens and legacy expiry bookkeeping out of browser source', () => {
    const sources = readSourceFiles(join(projectRoot, 'src'));

    for (const file of sources) {
      expect(file.source, file.path).not.toMatch(/\btoken\b/i);
      expect(file.source, file.path).not.toContain('planActivatedAt');
      expect(file.source, file.path).not.toMatch(/Authorization\s*['"\]]?\s*[:=]/i);
    }
  });
});
