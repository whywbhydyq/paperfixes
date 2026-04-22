import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email?: string;
  wechatName?: string;
  wechatAvatar?: string;
  role: string;
  plan: string;
  quota: number;
  totalUsed: number;
}

interface ActiveJob {
  jobId: string;
  phase: 'processing' | 'done';
  result?: string;
  inputLen?: number;
  outputLen?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  showLoginModal: boolean;
  activeJob: ActiveJob | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  updateQuota: (quota: number, totalUsed: number) => void;
  setActiveJob: (job: ActiveJob) => void;
  clearActiveJob: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      showLoginModal: false,
      activeJob: null,
      login: (user, token) =>
        set({ user, token, isLoggedIn: true, showLoginModal: false }),
      logout: () =>
        set({ user: null, token: null, isLoggedIn: false, activeJob: null }),
      openLoginModal: () => set({ showLoginModal: true }),
      closeLoginModal: () => set({ showLoginModal: false }),
      updateQuota: (quota, totalUsed) =>
        set((state) => ({
          user: state.user ? { ...state.user, quota, totalUsed } : null,
        })),
      setActiveJob: (job) => set({ activeJob: job }),
      clearActiveJob: () => set({ activeJob: null }),
    }),
    {
      name: 'aigc-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
        activeJob: state.activeJob,
      }),
    }
  )
);
