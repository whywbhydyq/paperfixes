import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { trackEvent } from '../lib/analytics';

export interface User {
  id: string;
  email?: string;
  phone?: string;
  wechatName?: string;
  role: string;
  plan: string;
  quota: number;
  totalUsed: number;
  hasPassword?: boolean;
  planExpiresAt?: string | null;
}

export interface ActiveJob {
  jobId: string;
  phase: 'processing' | 'done';
  result?: string;
  inputLen?: number;
  outputLen?: number;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  showLoginModal: boolean;
  activeJob: ActiveJob | null;
  inputText: string;
  login: (user: User) => void;
  clearSession: () => void;
  logout: () => Promise<void>;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  updateQuota: (quota: number, totalUsed: number) => void;
  updateUserEntitlements: (entitlements: {
    quota: number;
    totalUsed: number;
    plan: string;
    planExpiresAt: string | null;
  }) => void;
  setActiveJob: (job: ActiveJob) => void;
  clearActiveJob: () => void;
  saveInputText: (text: string) => void;
  clearInputText: () => void;
}

export interface PersistedAuthState {
  user: User | null;
  isLoggedIn: boolean;
  activeJob: Pick<ActiveJob, 'jobId' | 'phase'> | null;
}

export function selectPersistedAuthState(state: {
  user: User | null;
  isLoggedIn: boolean;
  activeJob: ActiveJob | null;
}): PersistedAuthState {
  return {
    user: state.user,
    isLoggedIn: state.isLoggedIn,
    activeJob:
      state.activeJob?.phase === 'processing'
        ? { jobId: state.activeJob.jobId, phase: 'processing' }
        : null,
  };
}

const clearSessionState = {
  user: null,
  isLoggedIn: false,
  activeJob: null,
  inputText: '',
} as const;

if (typeof window !== 'undefined') {
  window.localStorage.removeItem('aigc-auth-storage');
}

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], PersistedAuthState>(
    (set) => ({
      user: null,
      isLoggedIn: false,
      showLoginModal: false,
      activeJob: null,
      inputText: '',
      login: (user) => set({ user, isLoggedIn: true, showLoginModal: false }),
      clearSession: () => set(clearSessionState),
      logout: async () => {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin',
          });
        } finally {
          set(clearSessionState);
        }
      },
      openLoginModal: () => {
        trackEvent('login_modal_open', { path: window.location.pathname });
        set({ showLoginModal: true });
      },
      closeLoginModal: () => set({ showLoginModal: false }),
      updateQuota: (quota, totalUsed) =>
        set((state) => ({
          user: state.user ? { ...state.user, quota, totalUsed } : null,
        })),
      updateUserEntitlements: (entitlements) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...entitlements } : null,
        })),
      setActiveJob: (job) => set({ activeJob: job }),
      clearActiveJob: () => set({ activeJob: null }),
      saveInputText: (text) => set({ inputText: text }),
      clearInputText: () => set({ inputText: '' }),
    }),
    {
      name: 'paperfix-auth-storage-v2',
      partialize: selectPersistedAuthState,
    }
  )
);
