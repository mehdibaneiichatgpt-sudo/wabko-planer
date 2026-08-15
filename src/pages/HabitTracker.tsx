import { useMemo, useState } from 'react';
import { AreaChart, BarChart, Donut, ProgressBar, RankChart } from '../components/Charts.js';
import { HABIT_COLORS, makeId } from '../lib/defaults.js';
import {
  MONTHS,
  WEEKDAYS_SHORT,
  fa,
  monthKeys,
  monthWeekBuckets,
  monthWeekIndex,
  parseKey,
  startOfWeek,
  weekId,
  weekdayIndexOfKey,
} from '../lib/jalali.js';
import { activeHabits, habitMonthCount, habitStreaks, progress } from '../lib/stats.js';
import { FREQ_LABELS, type Habit, type HabitFreq } from '../lib/types.js';
import { usePlanner } from '../state/PlannerContext.js';

/** رنگ هر هفتهٔ ماه، هم‌ترتیب با نمونه‌ها */
const WEEK_TINTS = ['#eff6ff', '#f0fdf4', '#f5f3ff', '#fff7ed', '#fef2f2'];
const WEEK_ACCENTS = ['#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444'];
const WEEK_NAMES = ['هفتهٔ اول', 'هفتهٔ دوم', 'هفتهٔ سوم', 'هفتهٔ چهارم', 'هفتهٔ پنجم'];

export function HabitTracker() {
  const { data, selected, today, setSelected, toggleHabit, saveHabit, removeHabit, setMonthNote } =
    usePlanner();
  const view = parseKey(selected);
  const [newTitle, setNewTitle] = useState('');
  const [newFreq, setNewFreq] = useState<HabitFreq>('daily');
  const [newTarget, setNewTarget] = useState('30');

  const buckets = useMemo(() => monthWeekBuckets(view.jy, view.jm), [view.jy, view.jm]);
  const allDays = useMemo(() => monthKeys(view.jy, view.jm), [view.jy, view.jm]);
  const dailyHabits = activeHabits(data, 'daily');
  const weeklyHabits = activeHabits(data, 'weekly');
  const monthlyHabits = activeHabits(data, 'monthly');
  const monthKey = `${view.jy}-${String(view.jm).padStart(2, '0')}`;

  /** برای هر روز ماه: چند عادت انجام شده، چند نشده و چند درصد */
  const perDay = useMemo(
    () =>
      allDays.map((key) => {
        const done = dailyHabits.filter((h) => data.dailyLog[key]?.[h.id]).length;
        return {
          key,
          done,
          missed: dailyHabits.length - done,
          percent: dailyHabits.length === 0 ? 0 : Math.round((done / dailyHabits.length) * 100),
        };
      }),
    [allDays, dailyHabits, data],
  );

  const monthTotals = useMemo(() => {
    let done = 0;
    let target = 0;
    for (const habit of activeHabits(data)) {
      done += habitMonthCount(data, habit, view.jy, view.jm);
      target += habit.target;
    }
    return progress(done, target);
  }, [data, view.jy, view.jm]);

  /** پیشرفت هفتهٔ جاری بر اساس روزهایی از ماه که در همان هفته‌اند */
  const weekTotals = useMemo(() => {
    const sat = startOfWeek(today);
    const inWeek = perDay.filter((d) => startOfWeek(d.key) === sat);
    const done = inWeek.reduce((sum, d) => sum + d.done, 0);
    return progress(done, inWeek.length * dailyHabits.length);
  }, [perDay, today, dailyHabits.length]);

  const dailyBars = useMemo(
    () =>
      perDay.map((d) => ({
        label: fa(parseKey(d.key).jd),
        value: d.percent,
        color: d.key === today ? 'var(--brand)' : WEEK_ACCENTS[monthWeekIndex(d.key)],
      })),
    [perDay, today],
  );

  /** عادت‌های برتر ماه بر اساس تعداد دفعات انجام */
  const topHabits = useMemo(
    () =>
      activeHabits(data)
        .map((h) => ({
          label: h.title,
          emoji: h.emoji,
          value: habitMonthCount(data, h, view.jy, view.jm),
          color: h.color,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [data, view.jy, view.jm],
  );

  const shiftMonth = (delta: number) => {
    let jm = view.jm + delta;
    let jy = view.jy;
    if (jm < 1) {
      jm = 12;
      jy -= 1;
    } else if (jm > 12) {
      jm = 1;
      jy += 1;
    }
    setSelected(`${jy}-${String(jm).padStart(2, '0')}-01`);
  };

  const addHabit = (event: React.FormEvent) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    saveHabit({
      id: makeId('hbt'),
      title,
      emoji: '✅',
      freq: newFreq,
      target: Math.max(1, Number(newTarget) || 1),
      color: HABIT_COLORS[data.habits.length % HABIT_COLORS.length],
      active: true,
    });
    setNewTitle('');
  };

  const monthlyBlock = (habits: Habit[]) => {
    if (habits.length === 0) return <p className="muted">موردی تعریف نشده است.</p>;
    return (
      <ul className="habit-list">
        {habits.map((habit) => {
          const done = Boolean(data.monthlyLog[monthKey]?.[habit.id]);
          return (
            <li key={habit.id} className={done ? 'habit done' : 'habit'}>
              <label>
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggleHabit(allDays[0], habit)}
                />
                <span className="habit-emoji">{habit.emoji}</span>
                <span className="task-title">{habit.title}</span>
              </label>
            </li>
          );
        })}
      </ul>
    );
  };

  const weeklyBlock = (habits: Habit[]) => {
    if (habits.length === 0) return <p className="muted">موردی تعریف نشده است.</p>;
    return (
      <div className="weekly-habit-grid">
        {buckets.map((bucket, i) => {
          if (bucket.length === 0) return null;
          const id = weekId(bucket[0]);
          return (
            <div className="weekly-habit-col" key={id} style={{ background: WEEK_TINTS[i] }}>
              <h4>{WEEK_NAMES[i]}</h4>
              <ul className="habit-list">
                {habits.map((habit) => {
                  const done = Boolean(data.weeklyLog[id]?.[habit.id]);
                  return (
                    <li key={habit.id} className={done ? 'habit done' : 'habit'}>
                      <label>
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => toggleHabit(bucket[0], habit)}
                        />
                        <span className="task-title">{habit.title}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>ردیاب عادت</h1>
          <p className="muted">پیوستگی کارهای تکرارشوندهٔ فروشگاه</p>
        </div>
        <div className="datepicker-bar">
          <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="ماه قبل">
            ‹
          </button>
          <span className="date-display-main">
            {MONTHS[view.jm - 1]} {fa(view.jy)}
          </span>
          <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label="ماه بعد">
            ›
          </button>
        </div>
      </div>

      <section className="grid-hero">
        <div className="card donut-pair">
          <div>
            <h2 className="card-title center">پیشرفت ماهانه</h2>
            <Donut percent={monthTotals.percent} size={104} label="پیشرفت ماهانه" />
            <p className="muted center">
              {fa(monthTotals.done)} از {fa(monthTotals.total)}
            </p>
          </div>
          <div>
            <h2 className="card-title center">پیشرفت هفتگی</h2>
            <Donut
              percent={weekTotals.percent}
              size={104}
              color="#3b82f6"
              label="پیشرفت هفتگی"
            />
            <p className="muted center">
              {fa(weekTotals.done)} از {fa(weekTotals.total)}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2 className="card-title">روند پیشرفت روزانه</h2>
            <span className="group-count">تعداد عادات: {fa(dailyHabits.length)}</span>
          </div>
          <AreaChart data={perDay.map((d) => d.percent)} height={128} />
        </div>

        <div className="card">
          <h2 className="card-title">عادات برتر ماه</h2>
          <RankChart data={topHabits} />
        </div>
      </section>

      <section className="card scroll-card">
        <h2 className="card-title">جدول عادت‌های روزانه</h2>
        <div className="habit-grid-wrap">
          <table className="habit-grid">
            <thead>
              <tr>
                <th className="sticky-col">لیست عادت</th>
                <th className="target-col">هدف</th>
                {buckets.map((bucket, i) =>
                  bucket.length === 0 ? null : (
                    <th key={`w${i}`} colSpan={bucket.length} style={{ background: WEEK_TINTS[i] }}>
                      {WEEK_NAMES[i]}
                    </th>
                  ),
                )}
                <th className="count-col" rowSpan={2}>
                  تعداد
                </th>
              </tr>
              <tr>
                <th className="sticky-col" />
                <th className="target-col" />
                {allDays.map((key) => (
                  <th
                    key={key}
                    className="day-head"
                    style={{ background: WEEK_TINTS[monthWeekIndex(key)] }}
                  >
                    <span className="day-head-weekday">{WEEKDAYS_SHORT[weekdayIndexOfKey(key)]}</span>
                    <span>{fa(parseKey(key).jd)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dailyHabits.map((habit, row) => {
                const count = habitMonthCount(data, habit, view.jy, view.jm);
                return (
                  <tr key={habit.id}>
                    <th className="sticky-col habit-name">
                      <span className="row-number">{fa(row + 1)}</span>
                      <span className="habit-emoji">{habit.emoji}</span>
                      {habit.title}
                    </th>
                    <td className="target-col">{fa(habit.target)}</td>
                    {allDays.map((key) => {
                      const done = Boolean(data.dailyLog[key]?.[habit.id]);
                      return (
                        <td
                          key={key}
                          style={{ background: done ? undefined : WEEK_TINTS[monthWeekIndex(key)] }}
                        >
                          <input
                            type="checkbox"
                            checked={done}
                            onChange={() => toggleHabit(key, habit)}
                            aria-label={`${habit.title} در روز ${fa(parseKey(key).jd)}`}
                            style={{ accentColor: habit.color }}
                          />
                        </td>
                      );
                    })}
                    <td className="count-col">{fa(count)}</td>
                  </tr>
                );
              })}
              <tr className="summary-row">
                <th className="sticky-col">انجام شده</th>
                <td className="target-col" />
                {perDay.map((d) => (
                  <td key={d.key}>{fa(d.done)}</td>
                ))}
                <td />
              </tr>
              <tr className="summary-row">
                <th className="sticky-col">انجام نشده</th>
                <td className="target-col" />
                {perDay.map((d) => (
                  <td key={d.key}>{fa(d.missed)}</td>
                ))}
                <td />
              </tr>
              <tr className="summary-row">
                <th className="sticky-col">درصد</th>
                <td className="target-col" />
                {perDay.map((d) => (
                  <td key={d.key} className={d.percent === 100 ? 'full' : undefined}>
                    {fa(d.percent)}٪
                  </td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="group-title">پیشرفت روزانه</h3>
        <BarChart data={dailyBars} max={100} height={120} />
      </section>

      <section className="grid-two">
        <div className="card">
          <h2 className="card-title">پیشرفت و استریک</h2>
          <div className="streak-table-wrap">
            <table className="streak-table">
              <thead>
                <tr>
                  <th>عادت</th>
                  <th>پیشرفت</th>
                  <th>تعداد</th>
                  <th>استریک فعلی</th>
                  <th>بیشترین استریک</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {activeHabits(data).map((habit) => {
                  const count = habitMonthCount(data, habit, view.jy, view.jm);
                  const pct = habit.target === 0 ? 0 : Math.round((count / habit.target) * 100);
                  const reached = count >= habit.target;
                  const streak =
                    habit.freq === 'daily'
                      ? habitStreaks(data, habit.id, today)
                      : { current: 0, longest: 0 };
                  return (
                    <tr key={habit.id}>
                      <th>
                        <span className="habit-emoji">{habit.emoji}</span>
                        {habit.title}
                        <span className="freq-chip">{FREQ_LABELS[habit.freq]}</span>
                      </th>
                      <td className="bar-cell">
                        {/* رسیدن به هدف با سبز مشخص می‌شود */}
                        <ProgressBar percent={pct} color={reached ? '#22c55e' : habit.color} />
                      </td>
                      <td className={reached ? 'pos' : undefined}>
                        {fa(count)}/{fa(habit.target)}
                      </td>
                      <td>{habit.freq === 'daily' ? `🔥 ${fa(streak.current)}` : '—'}</td>
                      <td>{habit.freq === 'daily' ? fa(streak.longest) : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => {
                            if (window.confirm(`عادت «${habit.title}» حذف شود؟`)) removeHabit(habit.id);
                          }}
                          aria-label={`حذف ${habit.title}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h2 className="card-title">یادداشت ماه</h2>
            <textarea
              className="input textarea"
              rows={6}
              placeholder="جمع‌بندی ماه، کالاهای پرفروش، نکته‌های تأمین‌کننده…"
              value={data.monthNotes[monthKey] ?? ''}
              onChange={(e) => setMonthNote(monthKey, e.target.value)}
            />
          </div>

          <div className="card">
            <h2 className="card-title">افزودن عادت</h2>
            <form className="inline-form" onSubmit={addHabit}>
              <input
                className="input"
                placeholder="عنوان عادت…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <select
                className="input select"
                value={newFreq}
                onChange={(e) => setNewFreq(e.target.value as HabitFreq)}
              >
                <option value="daily">روزانه</option>
                <option value="weekly">هفتگی</option>
                <option value="monthly">ماهانه</option>
              </select>
              <input
                className="input input-sm"
                inputMode="numeric"
                placeholder="هدف ماه"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
              />
              <button type="submit" className="primary-btn">
                افزودن
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid-two">
        <div className="card">
          <h2 className="card-title">کارهای هفتگی</h2>
          {weeklyBlock(weeklyHabits)}
        </div>
        <div className="card">
          <h2 className="card-title">کارهای ماهانه</h2>
          {monthlyBlock(monthlyHabits)}
        </div>
      </section>
    </div>
  );
}
