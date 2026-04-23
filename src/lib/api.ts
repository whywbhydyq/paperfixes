/**
 * API 客户端 - 所有后端通信都经过这里
 * 后端是 Next.js + QStash 轮询架构，前端只负责：
 * 1. 提交任务 → 获取 jobId
 * 2. 每 2 秒轮询状态
 * 3. 获取结果
 */

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: '网络错误' }));
    throw new Error(data.error || `请求失败 (${res.status})`);
  }
  return res.json();
}

export async function registerWithEmail(email: string, password: string) {
  return request<{ user: any; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function loginWithEmail(email: string, password: string) {
  return request<{ user: any; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function sendSmsCode(phone: string) {
  return request<{ success: boolean; message: string; devCode?: string }>(
    '/api/auth/sms',
    { method: 'POST', body: JSON.stringify({ action: 'send', phone }) }
  );
}

export async function verifySmsCode(phone: string, code: string) {
  return request<{ user: any; token: string }>(
    '/api/auth/sms',
    { method: 'POST', body: JSON.stringify({ action: 'verify', phone, code }) }
  );
}

export interface SubmitResponse {
  jobId: string;
  quota: number;
}

export async function submitRewriteJob(
  text: string,
  token: string | null
): Promise<SubmitResponse> {
  return request<SubmitResponse>('/api/rewrite/submit', {
    method: 'POST',
    body: JSON.stringify({ text }),
  }, token);
}

export type JobStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface JobStatusResponse {
  status: JobStatus;
  result?: string;
  error?: string;
  inputLen?: number;
  outputLen?: number;
  doneAt?: string;
}

export async function pollJobStatus(
  jobId: string,
  token: string | null
): Promise<JobStatusResponse> {
  return request<JobStatusResponse>(`/api/rewrite/status/${jobId}`, {}, token);
}

export interface QuotaResponse {
  quota: number;
  totalUsed: number;
}

export async function fetchQuota(token: string | null): Promise<QuotaResponse> {
  return request<QuotaResponse>('/api/user?action=quota', {}, token);
}

export interface TopupRecord {
  id: string;
  amount: number;
  price: number;
  planKey: string;
  note: string | null;
  createdAt: string;
}

export async function fetchTopups(token: string | null): Promise<{ topups: TopupRecord[] }> {
  return request<{ topups: TopupRecord[] }>('/api/user?action=topups', {}, token);
}
export async function pollPaymentStatus(orderId: string, token: string | null) {
  return request<{ status: string }>(`/api/payment/create?orderId=${orderId}`, {}, token);
}