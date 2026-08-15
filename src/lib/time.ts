import { fa } from './jalali.js';
import type { Attendance } from './types.js';

const MINUTES_IN_DAY = 24 * 60;

/** ارقام فارسی و عربی را به لاتین برمی‌گرداند */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/** «۰۸:۳۰» یا «8:30» را به دقیقه از نیمه‌شب تبدیل می‌کند */
export function parseTime(value: string): number | null {
  if (!value) return null;
  const latin = toLatinDigits(value);
  const match = latin.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** «۷ ساعت و ۳۰ دقیقه» */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${fa(m)} دقیقه`;
  if (m === 0) return `${fa(h)} ساعت`;
  return `${fa(h)} ساعت و ${fa(m)} دقیقه`;
}

/** ساعت اعشاری برای جمع‌بندی ماهانه، مثل ۷٫۵ */
export function toHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

/**
 * فاصلهٔ دو ساعت.
 * فقط فروشگاهی که ساعت کاری‌اش از نیمه‌شب رد می‌شود اجازه دارد پایانِ
 * کوچک‌تر از شروع را «فردا» بخواند؛ برای بقیه چنین ورودی‌ای اشتباه تایپی
 * است و نباید بی‌صدا به یک شیفت ۲۴ساعته تبدیل شود.
 */
function span(from: number, to: number, allowOvernight: boolean): number | null {
  if (to >= from) return to - from;
  return allowOvernight ? to + MINUTES_IN_DAY - from : null;
}

/** آیا ساعت کاری فروشگاه از نیمه‌شب رد می‌شود؟ */
export function isOvernightShop(openTime: string, closeTime: string): boolean {
  const open = parseTime(openTime);
  const close = parseTime(closeTime);
  if (open === null || close === null) return false;
  return close < open;
}

/** مدت نهار بر حسب دقیقه؛ اگر هر دو ساعت ثبت نشده باشد صفر است */
export function lunchMinutes(record: Attendance | undefined, allowOvernight = false): number {
  if (!record) return 0;
  const out = parseTime(record.lunchOut);
  const back = parseTime(record.lunchIn);
  if (out === null || back === null) return 0;
  return span(out, back, allowOvernight) ?? 0;
}

/** کارکرد خالص: از ورود تا خروج منهای زمان نهار */
export function workedMinutes(record: Attendance | undefined, allowOvernight = false): number {
  if (!record) return 0;
  const start = parseTime(record.in);
  const end = parseTime(record.out);
  if (start === null || end === null) return 0;
  const gross = span(start, end, allowOvernight);
  if (gross === null) return 0;
  const lunch = lunchMinutes(record, allowOvernight);
  // نهارِ ثبت‌شده بیرون از بازهٔ شیفت نباید کارکرد را منفی کند
  return Math.max(0, gross - Math.min(lunch, gross));
}

export function isPresent(record: Attendance | undefined): boolean {
  return Boolean(record && parseTime(record.in) !== null);
}

export interface ShopHours {
  openTime: string;
  closeTime: string;
}

export interface AttendanceIssue {
  level: 'error' | 'warn';
  message: string;
  /** فیلدهایی که باید در رابط کاربری علامت بخورند */
  fields: TimeField[];
}

/**
 * ایراد ساعت‌های یک روز.
 * «error» یعنی ترتیب ساعت‌ها ممکن نیست و کارکرد قابل محاسبه نیست؛
 * «warn» یعنی محاسبه انجام شده ولی ساعت‌ها بیرون از ساعت کاری فروشگاه‌اند
 * و احتمالاً اشتباه تایپی است.
 */
export function attendanceIssue(
  record: Attendance | undefined,
  hours: ShopHours,
): AttendanceIssue | null {
  if (!record) return null;

  const overnight = isOvernightShop(hours.openTime, hours.closeTime);
  const start = parseTime(record.in);
  const end = parseTime(record.out);
  const lunchOut = parseTime(record.lunchOut);
  const lunchIn = parseTime(record.lunchIn);

  const filled = [record.lunchOut, record.lunchIn, record.out].some((v) => parseTime(v) !== null);
  if (start === null && filled) {
    return { level: 'error', message: 'ساعت ورود ثبت نشده', fields: ['in'] };
  }
  if (start === null) return null;

  if (!overnight) {
    if (end !== null && end < start) {
      return { level: 'error', message: 'خروج قبل از ورود است', fields: ['in', 'out'] };
    }
    if (lunchOut !== null && lunchOut < start) {
      return { level: 'error', message: 'نهار قبل از ورود است', fields: ['lunchOut'] };
    }
    if (lunchOut !== null && lunchIn !== null && lunchIn < lunchOut) {
      return { level: 'error', message: 'برگشت از نهار قبل از رفتن است', fields: ['lunchOut', 'lunchIn'] };
    }
    if (end !== null && lunchIn !== null && lunchIn > end) {
      return { level: 'error', message: 'برگشت از نهار بعد از خروج است', fields: ['lunchIn', 'out'] };
    }
  }

  const open = parseTime(hours.openTime);
  const close = parseTime(hours.closeTime);
  if (!overnight && open !== null && close !== null) {
    const outside: TimeField[] = [];
    if (start < open) outside.push('in');
    if (end !== null && end > close) outside.push('out');
    if (outside.length > 0) {
      return {
        level: 'warn',
        message: `بیرون از ساعت کاری (${fa(hours.openTime)} تا ${fa(hours.closeTime)})`,
        fields: outside,
      };
    }
  }

  return null;
}

export type TimeField = 'in' | 'lunchOut' | 'lunchIn' | 'out';

/**
 * ساعت یک روز، «لنگرانداخته» به ساعت ورود.
 * برای شیفتی که از نیمه‌شب رد می‌شود، خروجِ ۰۱:۰۰ به‌جای ۶۰ دقیقه،
 * ۱۵۰۰ دقیقه (یعنی ۲۵:۰۰) برگردانده می‌شود تا میانگین‌گیری به هم نریزد.
 */
export function anchoredTime(
  record: Attendance | undefined,
  field: TimeField,
): number | null {
  if (!record) return null;
  const value = parseTime(record[field]);
  if (value === null) return null;
  if (field === 'in') return value;
  const start = parseTime(record.in);
  if (start === null) return value;
  return value >= start ? value : value + MINUTES_IN_DAY;
}

/** میانگین چند ساعت؛ خروجی همیشه در بازهٔ ۰۰:۰۰ تا ۲۳:۵۹ است */
export function averageTime(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round(sum / values.length) % MINUTES_IN_DAY;
}

/** «۰۹:۱۵» یا خط تیره وقتی داده‌ای نیست */
export function formatClock(minutes: number | null): string {
  return minutes === null ? '—' : fa(formatTime(minutes));
}

export function averageOf(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

export function emptyAttendance(): Attendance {
  return { in: '', lunchOut: '', lunchIn: '', out: '', note: '' };
}
