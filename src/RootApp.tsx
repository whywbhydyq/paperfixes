import { useEffect } from 'react';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import { DeferredLoginModal } from './components/lazyLoginModal';
import { initAnalytics, trackPageView } from './lib/analytics';
import ReducePage from './pages/ReducePage';

export default function RootApp() {
  useEffect(() => {
    initAnalytics();
    const timer = window.setTimeout(
      () => trackPageView(`${window.location.pathname}${window.location.search}`),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      <Navbar />
      <main className="flex-1">
        <ReducePage />
      </main>
      <Footer />
      <DeferredLoginModal />
    </div>
  );
}
