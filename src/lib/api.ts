/**
 * API 客户端 - 所有后端通信都经过这里
 * 后端是 Next.js + QStash 轮询架构，前端只负责：
 * 1. 提交任务 → 获取 jobId
 * 2. 每 2 秒轮询状态
 * 3. 获取结果
 */

import type { User } from '../store/useAuthStore';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function request<T>(
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
  if (res.status === 401) {
    const { useAuthStore } = await import('../store/useAuthStore');
    const store = useAuthStore.getState();
    store.logout();
    store.openLoginModal();
    throw new Error('登录已过期，请重新登录');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: '网络错误' }));
    throw new Error(data.error || `请求失败 (${res.status})`);
  }
  return res.json();
}

export async function sendSmsCode(phone: string) {
  return request<{ success: boolean; message: string; devCode?: string }>(
    '/api/auth/sms',
    { method: 'POST', body: JSON.stringify({ action: 'send', phone }) }
  );
}

export async function verifySmsCode(phone: string, code: string) {
  return request<{ user: User; token: string; needsPassword?: boolean }>(
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

export async function phonePasswordLogin(phone: string, password: string) {
  return request<{ user: User; token: string }>('/api/auth/phone-login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
}

export async function setUserPassword(password: string, token: string | null) {
  return request<{ success: boolean }>('/api/auth/set-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  }, token);
}

export async function fetchTopups(token: string | null): Promise<{ topups: TopupRecord[] }> {
  return request<{ topups: TopupRecord[] }>('/api/user?action=topups', {}, token);
}

// ==================== 支付相关 API ====================

export interface JobRecord {
  id: string;
  inputText: string;
  outputText: string | null;
  status: string;
  inputLen: number | null;
  outputLen: number | null;
  createdAt: string;
  doneAt: string | null;
}

export async function fetchJobs(token: string | null): Promise<{ jobs: JobRecord[] }> {
  return request<{ jobs: JobRecord[] }>('/api/user?action=jobs', {}, token);
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
  token: string | null
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/user?action=password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  }, token);
}

export interface CreatePaymentResponse {
  submitUrl?: string;
  params?: Record<string, string>;
  orderId?: string;
  error?: string;
}

export async function createPaymentOrder(
  planKey: string,
  payType: 'alipay' | 'wxpay',
  token: string | null
): Promise<CreatePaymentResponse> {
  return request<CreatePaymentResponse>('/api/payment/create', {
    method: 'POST',
    body: JSON.stringify({ planKey, payType }),
  }, token);
}

export interface PaymentStatusResponse {
  status: string;
}

export async function pollPaymentStatus(
  orderId: string,
  token: string | null
): Promise<PaymentStatusResponse> {
  return request<PaymentStatusResponse>(`/api/payment/status?orderId=${orderId}&_t=${Date.now()}`, {}, token);
}