import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { initAnalytics, trackPageView } from './lib/analytics';
import SEO from './components/SEO';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { DeferredLoginModal } from './components/lazyLoginModal';
import ReducePage from './pages/ReducePage';

const HomePage = lazy(() => import('./pages/HomePage'));
const PaymentDonePage = lazy(() => import('./pages/PaymentDonePage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const BlogListPage = lazy(() => import('./pages/BlogListPage'));
const BlogArticlePage = lazy(() => import('./pages/BlogArticlePage'));
const ExamplesPage = lazy(() => import('./pages/ExamplesPage'));
const FaqPage = lazy(() => import('./pages/FaqPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));

function RouteFallback() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-6xl px-6 py-16 text-sm text-gray-500">
      页面加载中…
    </div>
  );
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    window.setTimeout(() => trackPageView(`${pathname}${search}`), 0);
  }, [pathname, search]);
  return null;
}

export default function App() {
  useEffect(() => {
    initAnalytics();
  }, []);
  return (
    <BrowserRouter>
      <SEO />
      <ScrollToTop />
      <div className="flex min-h-screen flex-col bg-white text-gray-900">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ReducePage />} />
            <Route path="/home" element={<LazyRoute><HomePage /></LazyRoute>} />
            <Route path="/pricing" element={<LazyRoute><PricingPage /></LazyRoute>} />
            <Route path="/examples" element={<LazyRoute><ExamplesPage /></LazyRoute>} />
            <Route path="/faq" element={<LazyRoute><FaqPage /></LazyRoute>} />
            <Route path="/privacy" element={<LazyRoute><PrivacyPage /></LazyRoute>} />
            <Route path="/terms" element={<LazyRoute><TermsPage /></LazyRoute>} />
            <Route path="/blog" element={<LazyRoute><BlogListPage /></LazyRoute>} />
            <Route path="/blog/:slug" element={<LazyRoute><BlogArticlePage /></LazyRoute>} />
            <Route path="/payment/done" element={<LazyRoute><PaymentDonePage /></LazyRoute>} />
            <Route path="/dashboard" element={<LazyRoute><DashboardPage /></LazyRoute>} />
            <Route path="/admin" element={<LazyRoute><AdminPage /></LazyRoute>} />
          </Routes>
        </main>
        <Footer />
        <DeferredLoginModal />
      </div>
    </BrowserRouter>
  );
}
