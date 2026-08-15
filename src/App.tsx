import { useState } from 'react';
import { DailyDashboard } from './pages/DailyDashboard.js';
import { FinanceTracker } from './pages/FinanceTracker.js';
import { HabitTracker } from './pages/HabitTracker.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { WeeklyPlanner } from './pages/WeeklyPlanner.js';
import { formatWithWeekday } from './lib/jalali.js';
import { PlannerProvider, usePlanner } from './state/PlannerContext.js';

type Tab = 'daily' | 'weekly' | 'habits' | 'finance' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'daily', label: 'داشبورد روزانه', icon: '📅' },
  { id: 'weekly', label: 'پلنر هفتگی', icon: '🗓️' },
  { id: 'habits', label: 'ردیاب عادت', icon: '🔥' },
  { id: 'finance', label: 'فروش و هزینه', icon: '💰' },
  { id: 'settings', label: 'تنظیمات', icon: '⚙️' },
];

function Shell() {
  const [tab, setTab] = useState<Tab>('daily');
  const { data, today } = usePlanner();

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
        <span className="today-chip">امروز: {formatWithWeekday(today)}</span>
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
        {tab === 'finance' && <FinanceTracker />}
        {tab === 'settings' && <SettingsPage />}
      </main>

      <footer className="footer">
        اطلاعات روی همین دستگاه ذخیره می‌شود — برای نسخهٔ پشتیبان به تنظیمات برو.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <PlannerProvider>
      <Shell />
    </PlannerProvider>
  );
}
