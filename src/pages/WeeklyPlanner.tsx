import { useMemo, useState } from 'react';
import { Donut } from '../components/Charts.js';
import { getDay } from '../lib/day.js';
import {
  WEEKDAYS,
  addKeyDays,
  fa,
  faNumber,
  formatLong,
  parseKey,
  startOfWeek,
  weekId,
  weekKeys,
  weekdayIndexOfKey,
} from '../lib/jalali.js';
import {
  activeHabits,
  dayScore,
  entriesForKeys,
  progress,
  summarize,
} from '../lib/stats.js';
import { usePlanner } from '../state/PlannerContext.js';

/** رنگ ملایم هر ستون، هم‌راستا با طرح نمونه */
const DAY_TINTS = [
  '#eff6ff',
  '#f0fdf4',
  '#fdf2f8',
  '#fffbeb',
  '#f5f3ff',
  '#ecfeff',
  '#f8fafc',
];

const DAY_ACCENTS = [
  '#3b82f6',
  '#22c55e',
  '#ec4899',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#64748b',
];

export function WeeklyPlanner() {
  const { data, selected, today, setSelected, toggleTask, addTask, toggleHabit } = usePlanner();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const days = useMemo(() => weekKeys(selected), [selected]);
  const weekStart = startOfWeek(selected);
  const weeklyHabits = activeHabits(data, 'weekly');
  const weekKey = weekId(selected);

  const weekProgress = useMemo(() => {
    const totals = days.reduce(
      (acc, key) => {
        const s = dayScore(data, key);
        return { done: acc.done + s.done, total: acc.total + s.total };
      },
      { done: 0, total: 0 },
    );
    return progress(totals.done, totals.total);
  }, [data, days]);

  const money = useMemo(() => summarize(entriesForKeys(data, days)), [data, days]);

  const weeklyHabitProgress = useMemo(() => {
    const done = weeklyHabits.filter((h) => data.weeklyLog[weekKey]?.[h.id]).length;
    return progress(done, weeklyHabits.length);
  }, [data, weekKey, weeklyHabits]);

  const submit = (key: string) => (event: React.FormEvent) => {
    event.preventDefault();
    addTask(key, drafts[key] ?? '', 'during');
    setDrafts((prev) => ({ ...prev, [key]: '' }));
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>پلنر هفتگی</h1>
          <p className="muted">
            {formatLong(weekStart)} تا {formatLong(addKeyDays(weekStart, 6))}
          </p>
        </div>
        <div className="datepicker-bar">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setSelected(addKeyDays(selected, -7))}
            aria-label="هفتهٔ قبل"
          >
            ‹
          </button>
          <button type="button" className="ghost-btn" onClick={() => setSelected(today)}>
            هفتهٔ جاری
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setSelected(addKeyDays(selected, 7))}
            aria-label="هفتهٔ بعد"
          >
            ›
          </button>
        </div>
      </div>

      <section className="grid-hero">
        <div className="card donut-card">
          <h2 className="card-title">پیشرفت هفته</h2>
          <Donut percent={weekProgress.percent} size={120} label="پیشرفت هفته" />
          <p className="muted center">
            تکمیل‌شده {fa(weekProgress.done)} از {fa(weekProgress.total)}
          </p>
        </div>

        <div className="card">
          <h2 className="card-title">خلاصهٔ مالی هفته</h2>
          <div className="stat-row">
            <div className="stat">
              <span className="stat-label">فروش</span>
              <strong className="pos">{faNumber(money.sales)}</strong>
            </div>
            <div className="stat">
              <span className="stat-label">هزینه</span>
              <strong className="neg">{faNumber(money.expenses)}</strong>
            </div>
            <div className="stat">
              <span className="stat-label">سود خالص</span>
              <strong className={money.net >= 0 ? 'pos' : 'neg'}>{faNumber(money.net)}</strong>
            </div>
            <div className="stat">
              <span className="stat-label">تعداد ثبت</span>
              <strong>{fa(money.count)}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2 className="card-title">کارهای هفتگی</h2>
            <span className="group-count">
              {fa(weeklyHabitProgress.done)}/{fa(weeklyHabitProgress.total)}
            </span>
          </div>
          {weeklyHabits.length === 0 && <p className="muted">کار هفتگی‌ای تعریف نشده است.</p>}
          <ul className="habit-list">
            {weeklyHabits.map((habit) => {
              const done = Boolean(data.weeklyLog[weekKey]?.[habit.id]);
              return (
                <li key={habit.id} className={done ? 'habit done' : 'habit'}>
                  <label>
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleHabit(selected, habit)}
                    />
                    <span className="habit-emoji">{habit.emoji}</span>
                    <span className="task-title">{habit.title}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="week-grid">
        {days.map((key) => {
          const idx = weekdayIndexOfKey(key);
          const day = getDay(data, key);
          const score = dayScore(data, key);
          const isToday = key === today;
          const isClosed = data.settings.closedWeekdays.includes(idx);

          return (
            <div
              className={`card day-col${isToday ? ' is-today' : ''}`}
              key={key}
              style={{ background: DAY_TINTS[idx] }}
            >
              <button type="button" className="day-col-head" onClick={() => setSelected(key)}>
                <span className="day-name">{WEEKDAYS[idx]}</span>
                <span className="day-date">{fa(parseKey(key).jd)}</span>
              </button>

              <Donut percent={score.percent} size={72} color={DAY_ACCENTS[idx]} label={WEEKDAYS[idx]} />

              {isClosed && <span className="closed-chip">تعطیل</span>}

              {day.focus && <p className="day-focus">{day.focus}</p>}

              <ul className="task-list compact">
                {day.tasks.map((task) => (
                  <li key={task.id} className={task.done ? 'task done' : 'task'}>
                    <label>
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTask(key, task.id)}
                      />
                      <span className="task-title">{task.title}</span>
                    </label>
                  </li>
                ))}
              </ul>

              <form onSubmit={submit(key)}>
                <input
                  className="input input-sm"
                  placeholder="+ کار جدید"
                  value={drafts[key] ?? ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </form>
            </div>
          );
        })}
      </section>
    </div>
  );
}
