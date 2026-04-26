import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  planActivatedAt: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  updateQuota: (quota: number, totalUsed: number) => void;
  setActiveJob: (job: ActiveJob) => void;
  clearActiveJob: () => void;
  saveInputText: (text: string) => void;
  clearInputText: () => void;
  checkPlanExpiry: () => void;
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
      planActivatedAt: null,
      login: (user, token) =>
        set((state) => {
          const prevPlan = state.user?.plan || 'free';
          const newPlan = user.plan;
          let planActivatedAt = state.planActivatedAt;
          if (newPlan !== 'free' && (prevPlan === 'free' || !planActivatedAt)) {
            planActivatedAt = new Date().toISOString();
          }
          if (newPlan === 'free') {
            planActivatedAt = null;
          }
          return { user, token, isLoggedIn: true, showLoginModal: false, planActivatedAt };
        }),
      checkPlanExpiry: () =>
        set((state) => {
          if (!state.user || state.user.plan === 'free' || !state.planActivatedAt) return state;
          const days = (Date.now() - new Date(state.planActivatedAt).getTime()) / (1000 * 60 * 60 * 24);
          if (days > 30) {
            return { user: { ...state.user, plan: 'free' }, planActivatedAt: null };
          }
          return state;
        }),
      logout: () =>
        set({ user: null, token: null, isLoggedIn: false, activeJob: null, planActivatedAt: null }),
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
        planActivatedAt: state.planActivatedAt,
      }),
    }
  )
);