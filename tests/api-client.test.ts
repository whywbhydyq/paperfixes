import { afterEach, describe, expect, it, vi } from 'vitest';
import { request } from '../src/lib/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browser API error messages', () => {
  it('does not mislabel a non-JSON HTTP 500 response as a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<!doctype html>Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })));

    await expect(request('/api/auth/sms', { method: 'POST' }))
      .rejects.toThrow('服务暂不可用，请稍后重试（HTTP 500）');
  });

  it('uses a connectivity message only when fetch itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));

    await expect(request('/api/auth/sms', { method: 'POST' }))
      .rejects.toThrow('无法连接服务器，请检查网络后重试');
  });
});
