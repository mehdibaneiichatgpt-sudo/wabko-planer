import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/700.css';
import App from './App.js';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('عنصر ریشه پیدا نشد');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// در حالت توسعه ثبت نمی‌شود تا تغییرها بدون دردسر حافظه دیده شوند.
// روی file:// هم اصلاً معنی ندارد، چون آنجا فایل از قبل روی دستگاه است.
const canUseServiceWorker =
  import.meta.env.PROD &&
  'serviceWorker' in navigator &&
  (location.protocol === 'https:' || location.hostname === 'localhost');

if (canUseServiceWorker) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      // نبود پشتیبانی آفلاین نباید جلوی اجرای برنامه را بگیرد
      console.warn('ثبت Service Worker ناموفق بود:', error);
    });
  });
}
