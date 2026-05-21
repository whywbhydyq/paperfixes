type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA_ID || import.meta.env.VITE_GA_MEASUREMENT_ID || '';
let initialized = false;

function sanitizeParams(params: AnalyticsParams = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

export function initAnalytics() {
  if (!GA_ID || initialized || typeof window === 'undefined') return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, {
    send_page_view: false,
    anonymize_ip: true,
  });
}

export function trackPageView(path: string, title = document.title) {
  if (!GA_ID || typeof window === 'undefined') return;
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  const payload = sanitizeParams(params);
  if (!GA_ID || typeof window === 'undefined') {
    if (import.meta.env.DEV) console.info('[analytics]', eventName, payload);
    return;
  }
  window.gtag?.('event', eventName, payload);
}
