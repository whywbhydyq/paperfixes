import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callRewriteAI } from '../api/_lib/ai';

const apiKey = 'sk-or-v1-test-secret-never-log';
const originalText = '这是一段不应出现在错误日志里的完整用户原文';

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function successResponse(model = 'primary/model') {
  return jsonResponse({
    model,
    choices: [{ message: { content: '稳定的改写结果' } }],
    usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
  });
}

function failureResponse(
  status: number,
  errorType: string,
  options: { requestId?: string; retryAfter?: string; message?: string } = {},
) {
  const headers: Record<string, string> = {};
  if (options.requestId) headers['x-request-id'] = options.requestId;
  if (options.retryAfter) headers['retry-after'] = options.retryAfter;
  return jsonResponse({
    error: {
      code: status,
      message: options.message ?? 'provider rejected request',
      metadata: { error_type: errorType },
    },
  }, status, headers);
}

beforeEach(() => {
  vi.stubEnv('OPENROUTER_API_KEY', apiKey);
  vi.stubEnv('OPENROUTER_MODEL', 'primary/model');
  vi.stubEnv('OPENROUTER_FALLBACK_MODEL', 'fallback/model');
  vi.stubEnv('SITE_URL', 'https://paperfix.example');
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('OpenRouter request routing', () => {
  it('passes the configured primary and fallback models in priority order', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue(successResponse('fallback/model'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callRewriteAI('待改写内容', 'job-models')).resolves.toBe('稳定的改写结果');

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.models).toEqual(['primary/model', 'fallback/model']);
    expect(body).not.toHaveProperty('model');
    expect(JSON.stringify(consoleLog.mock.calls)).toContain('model=fallback/model');
  });
});

describe('OpenRouter failures', () => {
  it.each([
    [401, 'authentication', 'OpenRouter 凭据无效或已停用'],
    [402, 'payment_required', 'OpenRouter 账户或密钥余额不足'],
    [403, 'permission_denied', 'OpenRouter 请求被拒绝或密钥权限不足'],
    [500, 'server', 'OpenRouter 服务暂时不可用'],
  ])('classifies HTTP %i without retrying', async (status, errorType, message) => {
    const fetchMock = vi.fn().mockResolvedValue(
      failureResponse(status, errorType, { requestId: `req-${status}` }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(callRewriteAI(originalText, `job-${status}`)).rejects.toMatchObject({
      message,
      status,
      errorType,
      requestId: `req-${status}`,
      retryable: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry before a Retry-After value that exceeds the short wait cap', async () => {
    const fetchMock = vi.fn().mockResolvedValue(failureResponse(429, 'rate_limit_exceeded', {
      requestId: 'req-long-rate-limit',
      retryAfter: '60',
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callRewriteAI('待改写内容', 'job-long-429')).rejects.toMatchObject({
      status: 429,
      errorType: 'rate_limit_exceeded',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('honors a short Retry-After value and retries a 429 response once', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(failureResponse(429, 'rate_limit_exceeded', {
        requestId: 'req-rate-limit',
        retryAfter: '1',
      }))
      .mockResolvedValueOnce(successResponse());
    vi.stubGlobal('fetch', fetchMock);

    const resultPromise = callRewriteAI('待改写内容', 'job-retry-429');
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(resultPromise).resolves.toBe('稳定的改写结果');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never performs more than one retry', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(
      failureResponse(503, 'provider_overloaded', { retryAfter: '0.01' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const rejection = expect(callRewriteAI('待改写内容', 'job-one-retry')).rejects.toMatchObject({
      status: 503,
      errorType: 'provider_overloaded',
    });
    await vi.advanceTimersByTimeAsync(10);

    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries 503 once when Retry-After is usable', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(failureResponse(503, 'provider_overloaded', {
        retryAfter: '0.01',
      }))
      .mockResolvedValueOnce(successResponse());
    vi.stubGlobal('fetch', fetchMock);

    const resultPromise = callRewriteAI('待改写内容', 'job-retry-503');
    await vi.advanceTimersByTimeAsync(10);

    await expect(resultPromise).resolves.toBe('稳定的改写结果');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not blindly retry a 429 response without a valid Retry-After value', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      failureResponse(429, 'rate_limit_exceeded', { retryAfter: 'not-a-delay' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(callRewriteAI('待改写内容', 'job-no-delay')).rejects.toMatchObject({
      message: 'OpenRouter 请求过于频繁，请稍后重试',
      status: 429,
      errorType: 'rate_limit_exceeded',
      retryable: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('classifies an error returned inside an HTTP 200 body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      id: 'req-body-error',
      error: {
        code: 403,
        message: 'blocked by guardrail',
        metadata: { error_type: 'permission_denied' },
      },
      choices: [],
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callRewriteAI(originalText, 'job-body-error')).rejects.toMatchObject({
      message: 'OpenRouter 请求被拒绝或密钥权限不足',
      status: 403,
      errorType: 'permission_denied',
      requestId: 'req-body-error',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('logs only safe error metadata rather than provider text, keys, or user input', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue(failureResponse(401, 'authentication', {
      requestId: 'req-safe-log',
      message: `provider echoed ${apiKey} and ${originalText}`,
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callRewriteAI(originalText, 'job-safe-log')).rejects.toBeDefined();

    const serializedLog = JSON.stringify(consoleError.mock.calls);
    expect(serializedLog).toContain('401');
    expect(serializedLog).toContain('authentication');
    expect(serializedLog).toContain('req-safe-log');
    expect(serializedLog).not.toContain(apiKey);
    expect(serializedLog).not.toContain(originalText);
  });
});
