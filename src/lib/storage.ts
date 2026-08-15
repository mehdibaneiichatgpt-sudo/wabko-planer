import { DATA_VERSION, defaultData } from './defaults.js';
import type { PlannerData } from './types.js';

const STORAGE_KEY = 'wabko-planer:v1';
const API = './api/data';
const HEALTH = './api/health';

/** «file» یعنی داده در فایل واقعی روی دیسک است، «browser» یعنی داخل مرورگر */
export type Backend = 'file' | 'browser';

export interface StorageInfo {
  backend: Backend;
  /** مسیر فایل داده، وقتی سرور محلی در کار باشد */
  file?: string;
}

let info: StorageInfo = { backend: 'browser' };

export function storageInfo(): StorageInfo {
  return info;
}

/**
 * داده‌های خوانده‌شده ممکن است ناقص یا مربوط به نسخهٔ قدیمی باشند،
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
    monthNotes: input.monthNotes ?? {},
    employees: input.employees ?? [],
    attendance: input.attendance ?? {},
    finance: input.finance ?? [],
  };
}

/* ----------------------------- حافظهٔ مرورگر ---------------------------- */

function loadFromBrowser(): PlannerData {
  if (typeof localStorage === 'undefined') return defaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrate(JSON.parse(raw)) : defaultData();
  } catch (error) {
    console.error('خواندن اطلاعات ذخیره‌شده ناموفق بود:', error);
    return defaultData();
  }
}

function saveToBrowser(data: PlannerData): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ------------------------------ فایل روی دیسک --------------------------- */

async function loadFromFile(): Promise<PlannerData> {
  const response = await fetch(API, { cache: 'no-store' });
  if (!response.ok) throw new Error(`خواندن فایل داده ناموفق بود (${response.status})`);
  const body = (await response.json()) as { data: unknown };
  return migrate(body.data);
}

async function saveToFile(data: PlannerData): Promise<void> {
  const response = await fetch(API, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error((body as { error?: string }).error ?? 'ذخیره ناموفق بود');
  }
}

/* -------------------------------- انتخاب ------------------------------- */

/** آیا سرور محلی در دسترس است؟ */
async function probeServer(): Promise<StorageInfo | null> {
  try {
    const response = await fetch(HEALTH, { cache: 'no-store' });
    if (!response.ok) return null;
    const body = (await response.json()) as { app?: string; file?: string };
    if (body.app !== 'wabko-planer') return null;
    return { backend: 'file', file: body.file };
  } catch {
    // بدون سرور باز شده — مثلاً فایل تکی یا GitHub Pages
    return null;
  }
}

/**
 * یک‌بار در شروع اجرا می‌شود: مشخص می‌کند داده کجاست و آن را می‌خواند.
 * اگر سرور محلی باشد ولی خواندنش خطا بدهد، به‌جای پاک کردن داده‌ها خطا
 * برمی‌گرداند تا برنامه به‌اشتباه روی داده‌های خالی ننشیند.
 */
export async function initStorage(): Promise<PlannerData> {
  const server = await probeServer();

  if (server) {
    info = server;
    return loadFromFile();
  }

  info = { backend: 'browser' };
  return loadFromBrowser();
}

export async function saveData(data: PlannerData): Promise<void> {
  if (info.backend === 'file') return saveToFile(data);
  saveToBrowser(data);
}

/* ---------------------------- پشتیبان دستی ----------------------------- */

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
  return migrate(JSON.parse(await file.text()));
}

export function clearBrowserData(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
