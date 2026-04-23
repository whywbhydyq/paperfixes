import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email?: string;
  phone?: string;
  wechatName?: string;
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
  inputText: string;
  login: (user: User, token: string) => void;
  logout: () => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  updateQuota: (quota: number, totalUsed: number) => void;
  setActiveJob: (job: ActiveJob) => void;
  clearActiveJob: () => void;
  saveInputText: (text: string) => void;
  clearInputText: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      showLoginModal: false,
      activeJob: null,
      inputText: '',
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
      saveInputText: (text) => set({ inputText: text }),
      clearInputText: () => set({ inputText: '' }),
    }),
    {
      name: 'aigc-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
        activeJob: state.activeJob,
        inputText: state.inputText,
      }),
    }
  )
);