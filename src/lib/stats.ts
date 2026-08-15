import {
  addKeyDays,
  diffDays,
  monthId,
  monthKeys,
  parseKey,
  weekId,
} from './jalali.js';
import { getDay } from './day.js';
import type { FinanceEntry, Habit, PlannerData } from './types.js';

export interface Progress {
  done: number;
  total: number;
  percent: number;
}

export function progress(done: number, total: number): Progress {
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/* ------------------------------ کارها ------------------------------ */

export function taskProgress(data: PlannerData, key: string): Progress {
  const { tasks } = getDay(data, key);
  return progress(tasks.filter((t) => t.done).length, tasks.length);
}

/* ----------------------------- عادت‌ها ----------------------------- */

export function activeHabits(data: PlannerData, freq?: Habit['freq']): Habit[] {
  return data.habits.filter((h) => h.active && (freq === undefined || h.freq === freq));
}

export function isHabitDone(data: PlannerData, habit: Habit, key: string): boolean {
  if (habit.freq === 'daily') return Boolean(data.dailyLog[key]?.[habit.id]);
  if (habit.freq === 'weekly') return Boolean(data.weeklyLog[weekId(key)]?.[habit.id]);
  return Boolean(data.monthlyLog[monthId(key)]?.[habit.id]);
}

export function dailyHabitProgress(data: PlannerData, key: string): Progress {
  const habits = activeHabits(data, 'daily');
  const done = habits.filter((h) => data.dailyLog[key]?.[h.id]).length;
  return progress(done, habits.length);
}

/** درصد کلی روز: کارهای چک‌لیست به‌علاوهٔ عادت‌های روزانه */
export function dayScore(data: PlannerData, key: string): Progress {
  const t = taskProgress(data, key);
  const h = dailyHabitProgress(data, key);
  return progress(t.done + h.done, t.total + h.total);
}

/** تعداد دفعات انجام یک عادت روزانه در یک ماه */
export function habitMonthCount(
  data: PlannerData,
  habit: Habit,
  jy: number,
  jm: number,
): number {
  if (habit.freq === 'daily') {
    return monthKeys(jy, jm).filter((k) => data.dailyLog[k]?.[habit.id]).length;
  }
  if (habit.freq === 'weekly') {
    const seen = new Set(monthKeys(jy, jm).map(weekId));
    return [...seen].filter((w) => data.weeklyLog[w]?.[habit.id]).length;
  }
  return data.monthlyLog[`${jy}-${String(jm).padStart(2, '0')}`]?.[habit.id] ? 1 : 0;
}

export interface Streaks {
  current: number;
  longest: number;
}

/**
 * پیوستگی (استریک) عادت روزانه.
 * استریک فعلی از روز مرجع به عقب شمرده می‌شود؛ اگر امروز هنوز تیک نخورده
 * باشد از دیروز شروع می‌شود تا روزِ در جریان، استریک را صفر نکند.
 */
export function habitStreaks(data: PlannerData, habitId: string, refKey: string): Streaks {
  const doneKeys = Object.keys(data.dailyLog)
    .filter((k) => data.dailyLog[k]?.[habitId])
    .sort();

  if (doneKeys.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < doneKeys.length; i += 1) {
    const gap = diffDays(parseKey(doneKeys[i]), parseKey(doneKeys[i - 1]));
    run = gap === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const doneSet = new Set(doneKeys);
  let cursor = doneSet.has(refKey) ? refKey : addKeyDays(refKey, -1);
  let current = 0;
  while (doneSet.has(cursor)) {
    current += 1;
    cursor = addKeyDays(cursor, -1);
  }

  return { current, longest };
}

/* ------------------------------ مالی ------------------------------ */

export interface FinanceSummary {
  sales: number;
  expenses: number;
  net: number;
  count: number;
}

export function summarize(entries: FinanceEntry[]): FinanceSummary {
  let sales = 0;
  let expenses = 0;
  for (const e of entries) {
    if (e.type === 'sale') sales += e.amount;
    else expenses += e.amount;
  }
  return { sales, expenses, net: sales - expenses, count: entries.length };
}

export function entriesForDay(data: PlannerData, key: string): FinanceEntry[] {
  return data.finance.filter((e) => e.date === key);
}

export function entriesForMonth(data: PlannerData, jy: number, jm: number): FinanceEntry[] {
  const prefix = `${jy}-${String(jm).padStart(2, '0')}-`;
  return data.finance.filter((e) => e.date.startsWith(prefix));
}

export function entriesForKeys(data: PlannerData, keys: string[]): FinanceEntry[] {
  const set = new Set(keys);
  return data.finance.filter((e) => set.has(e.date));
}

/** جمع هر دسته، مرتب‌شده از بیشترین به کمترین */
export function byCategory(
  entries: FinanceEntry[],
  type: FinanceEntry['type'],
): { category: string; amount: number }[] {
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== type) continue;
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
