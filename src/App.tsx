import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import SEO from './components/SEO';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoginModal from './components/LoginModal';
import HomePage from './pages/HomePage';
import ReducePage from './pages/ReducePage';
import PaymentDonePage from "./pages/PaymentDonePage";
import PricingPage from './pages/PricingPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const { checkPlanExpiry } = useAuthStore();
  useEffect(() => { checkPlanExpiry(); }, [checkPlanExpiry]);
  return (
    <BrowserRouter>
      <SEO />
      <ScrollToTop />
      <div className="flex min-h-screen flex-col bg-white text-gray-900">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ReducePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/payment/done" element={<PaymentDonePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
        <Footer />
        <LoginModal />
      </div>
    </BrowserRouter>
  );
}
