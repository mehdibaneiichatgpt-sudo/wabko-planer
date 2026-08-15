import { useEffect, useState } from 'react';
import { DailyDashboard } from './pages/DailyDashboard.js';
import { FinanceTracker } from './pages/FinanceTracker.js';
import { HabitTracker } from './pages/HabitTracker.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { StaffPage } from './pages/StaffPage.js';
import { WeeklyPlanner } from './pages/WeeklyPlanner.js';
import { formatWithWeekday } from './lib/jalali.js';
import { initStorage } from './lib/storage.js';
import type { PlannerData } from './lib/types.js';
import { PlannerProvider, usePlanner } from './state/PlannerContext.js';

type Tab = 'daily' | 'weekly' | 'habits' | 'staff' | 'finance' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'daily', label: 'داشبورد روزانه', icon: '📅' },
  { id: 'weekly', label: 'پلنر هفتگی', icon: '🗓️' },
  { id: 'habits', label: 'ردیاب عادت', icon: '🔥' },
  { id: 'staff', label: 'کارکنان', icon: '👥' },
  { id: 'finance', label: 'فروش و هزینه', icon: '💰' },
  { id: 'settings', label: 'تنظیمات', icon: '⚙️' },
];

/** وضعیت اتصال، فقط برای اطلاع کاربر — کار برنامه به آن وابسته نیست */
function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}

function SaveIndicator() {
  const { saveState, saveError, storage } = usePlanner();

  if (saveState === 'error') {
    return (
      <span className="save-chip save-error" title={saveError ?? undefined}>
        ذخیره نشد
      </span>
    );
  }

  if (saveState === 'saving') {
    return <span className="save-chip save-busy">در حال ذخیره…</span>;
  }

  return (
    <span
      className="save-chip save-ok"
      title={
        storage.backend === 'file'
          ? `همه‌چیز در فایل ${storage.file ?? 'data.json'} ذخیره شده است`
          : 'در حافظهٔ همین مرورگر ذخیره شده است'
      }
    >
      ذخیره شد
    </span>
  );
}

function Shell() {
  const [tab, setTab] = useState<Tab>('daily');
  const { data, today, storage } = usePlanner();
  const online = useOnline();

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            🏪
          </span>
          <div>
            <strong>{data.settings.shopName}</strong>
            <small>پلنر روزانهٔ فروشگاه</small>
          </div>
        </div>
        <div className="topbar-side">
          <SaveIndicator />
          {!online && (
            <span className="offline-chip" title="برنامه بدون اینترنت هم کار می‌کند">
              آفلاین
            </span>
          )}
          <span className="today-chip">امروز: {formatWithWeekday(today)}</span>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            <span aria-hidden>{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <main>
        {tab === 'daily' && <DailyDashboard />}
        {tab === 'weekly' && <WeeklyPlanner />}
        {tab === 'habits' && <HabitTracker />}
        {tab === 'staff' && <StaffPage />}
        {tab === 'finance' && <FinanceTracker />}
        {tab === 'settings' && <SettingsPage />}
      </main>

      <footer className="footer">
        {storage.backend === 'file'
          ? `اطلاعات با هر تغییر در فایل ${storage.file ?? 'data.json'} ذخیره می‌شود.`
          : 'اطلاعات در حافظهٔ همین مرورگر ذخیره می‌شود — برای نسخهٔ پشتیبان به تنظیمات برو.'}
      </footer>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<PlannerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initStorage()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="app boot">
        <div className="card boot-card">
          <h1>اطلاعات خوانده نشد</h1>
          <p className="muted">{error}</p>
          <p className="muted">
            برای اینکه داده‌ای از دست نرود، برنامه بدون اطلاعات بالا نمی‌آید. پنجرهٔ سرور را
            ببند و دوباره اجرا کن؛ اگر باز هم تکرار شد، فایل <code>data.json</code> و پوشهٔ
            <code>backups</code> را نگه دار.
          </p>
          <button type="button" className="primary-btn" onClick={() => window.location.reload()}>
            تلاش دوباره
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="app boot">
        <div className="card boot-card">
          <p className="muted">در حال بارگذاری اطلاعات…</p>
        </div>
      </div>
    );
  }

  return (
    <PlannerProvider data={data}>
      <Shell />
    </PlannerProvider>
  );
}
