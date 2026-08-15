import { weekdayIndexOfKey } from './jalali.js';
import { makeId } from './defaults.js';
import type { DayRecord, PlannerData, Task } from './types.js';

/** کارهای تکرارشوندهٔ متعلق به یک روز هفته */
export function tasksFromTemplates(data: PlannerData, key: string): Task[] {
  const weekday = weekdayIndexOfKey(key);
  // روز تعطیل چک‌لیست خودکار نمی‌گیرد، اما کار دستی روی آن قابل ثبت است
  if (data.settings.closedWeekdays.includes(weekday)) return [];
  return data.templates
    .filter((t) => t.active && (t.weekdays.length === 0 || t.weekdays.includes(weekday)))
    .map((t) => ({
      id: makeId('task'),
      title: t.title,
      category: t.category,
      priority: t.priority,
      done: false,
      templateId: t.id,
    }));
}

export function emptyDay(): DayRecord {
  return { focus: '', tasks: [], note: '', staff: '' };
}

/**
 * رکورد یک روز. روزهایی که هنوز دست‌کاری نشده‌اند در حافظه ذخیره نمی‌شوند و
 * چک‌لیست‌شان همان لحظه از روی قالب‌ها ساخته می‌شود؛ به‌محض اولین تغییر،
 * همان نسخه ذخیره و از قالب‌ها مستقل می‌شود.
 */
export function getDay(data: PlannerData, key: string): DayRecord {
  const stored = data.days[key];
  if (stored) return stored;
  return { ...emptyDay(), tasks: tasksFromTemplates(data, key) };
}

export function isMaterialized(data: PlannerData, key: string): boolean {
  return Boolean(data.days[key]);
}
