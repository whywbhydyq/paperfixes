/**
 * 浏览器 API 客户端。会话只通过同源 HttpOnly Cookie 发送。
 */

import type { User } from '../store/useAuthStore';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'same-origin',
    headers,
  });
  if (res.status === 401) {
    const { useAuthStore } = await import('../store/useAuthStore');
    const store = useAuthStore.getState();
    store.clearSession();
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
  return request<{ user: User; needsPassword?: boolean }>(
    '/api/auth/sms',
    { method: 'POST', body: JSON.stringify({ action: 'verify', phone, code }) }
  );
}

export interface SubmitResponse {
  jobId: string;
  quota: number;
}

export async function submitRewriteJob(text: string): Promise<SubmitResponse> {
  return request<SubmitResponse>('/api/rewrite/submit', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
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

export async function pollJobStatus(jobId: string): Promise<JobStatusResponse> {
  return request<JobStatusResponse>(`/api/rewrite/status/${jobId}`);
}

export interface QuotaResponse {
  quota: number;
  totalUsed: number;
  plan: string;
  planExpiresAt: string | null;
}

export async function fetchQuota(): Promise<QuotaResponse> {
  return request<QuotaResponse>('/api/user?action=quota');
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
  return request<{ user: User }>('/api/auth/phone-login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
}

export async function setUserPassword(password: string) {
  return request<{ success: boolean }>('/api/auth/set-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function fetchTopups(): Promise<{ topups: TopupRecord[] }> {
  return request<{ topups: TopupRecord[] }>('/api/user?action=topups');
}

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

export async function fetchJobs(): Promise<{ jobs: JobRecord[] }> {
  return request<{ jobs: JobRecord[] }>('/api/user?action=jobs');
}

export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/user?action=password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

export interface CreatePaymentResponse {
  submitUrl?: string;
  params?: Record<string, string>;
  orderId?: string;
  error?: string;
}

export async function createPaymentOrder(
  planKey: string,
  payType: 'alipay' | 'wxpay'
): Promise<CreatePaymentResponse> {
  return request<CreatePaymentResponse>('/api/payment/create', {
    method: 'POST',
    body: JSON.stringify({ planKey, payType }),
  });
}

export interface PaymentStatusResponse {
  status: string;
}

export async function pollPaymentStatus(orderId: string): Promise<PaymentStatusResponse> {
  return request<PaymentStatusResponse>(`/api/payment/status?orderId=${orderId}&_t=${Date.now()}`);
}
