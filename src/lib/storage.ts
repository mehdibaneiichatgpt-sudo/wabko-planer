import { DATA_VERSION, defaultData } from './defaults.js';
import type { PlannerData } from './types.js';

const STORAGE_KEY = 'wabko-planer:v1';

/**
 * داده‌های خوانده‌شده از حافظه ممکن است ناقص یا مربوط به نسخهٔ قدیمی باشند،
 * پس همیشه روی ساختار پیش‌فرض سوار می‌شوند تا هیچ فیلدی جا نیفتد.
 */
function migrate(raw: unknown): PlannerData {
  const base = defaultData();
  if (!raw || typeof raw !== 'object') return base;
  const input = raw as Partial<PlannerData>;

  return {
    version: DATA_VERSION,
    settings: { ...base.settings, ...(input.settings ?? {}) },
    templates: input.templates ?? base.templates,
    habits: input.habits ?? base.habits,
    days: input.days ?? {},
    dailyLog: input.dailyLog ?? {},
    weeklyLog: input.weeklyLog ?? {},
    monthlyLog: input.monthlyLog ?? {},
    finance: input.finance ?? [],
  };
}

export function loadData(): PlannerData {
  if (typeof localStorage === 'undefined') return defaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    return migrate(JSON.parse(raw));
  } catch (error) {
    console.error('خواندن اطلاعات ذخیره‌شده ناموفق بود:', error);
    return defaultData();
  }
}

export function saveData(data: PlannerData): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('ذخیرهٔ اطلاعات ناموفق بود:', error);
  }
}

/** گرفتن نسخهٔ پشتیبان به‌صورت فایل JSON */
export function exportData(data: PlannerData, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importData(file: File): Promise<PlannerData> {
  const text = await file.text();
  return migrate(JSON.parse(text));
}

export function clearData(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
