import { lazy, Suspense } from 'react';
import { useAuthStore } from '../store/useAuthStore';

const loadLoginModal = () => import('./LoginModal');
const LoginModal = lazy(loadLoginModal);

export function preloadLoginModal(): Promise<unknown> {
  return loadLoginModal();
}

export function DeferredLoginModal() {
  const open = useAuthStore((state) => state.showLoginModal);
  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <LoginModal />
    </Suspense>
  );
}
