/**
 * تبدیل تقویم شمسی (جلالی) و میلادی بر پایهٔ الگوریتم بورکوفسکی.
 * بدون وابستگی خارجی تا اپ کاملاً آفلاین کار کند.
 */

export interface JDate {
  jy: number;
  jm: number;
  jd: number;
}

const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b;

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192,
  2262, 2324, 2394, 2456, 3178,
];

interface JalCal {
  leap: number;
  gy: number;
  march: number;
}

function jalCal(jy: number, withoutLeap: boolean): JalCal {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];

  if (jy < jp || jy >= BREAKS[bl - 1]) {
    throw new Error(`سال شمسی نامعتبر: ${jy}`);
  }

  let jump = 0;
  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  let leap = -1;
  if (!withoutLeap) {
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
  }

  return { leap, gy, march };
}

/** شمارهٔ روز ژولین از تاریخ میلادی */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

/** تاریخ میلادی از شمارهٔ روز ژولین */
function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy, true);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): JDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy, false);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }

  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export function isLeapJalaaliYear(jy: number): boolean {
  return jalCal(jy, false).leap === 0;
}

/** تعداد روزهای یک ماه شمسی */
export function jalaaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaaliYear(jy) ? 30 : 29;
}

export function toJalaali(date: Date): JDate {
  return d2j(g2d(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}

export function toGregorian(jy: number, jm: number, jd: number): Date {
  const g = d2g(j2d(jy, jm, jd));
  return new Date(g.gy, g.gm - 1, g.gd);
}

/* ------------------------------------------------------------------ */
/* کلید تاریخ: رشتهٔ «۱۴۰۵-۰۵-۲۴» که هم مرتب‌شدنی است هم خوانا           */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(d: JDate): string {
  return `${d.jy}-${pad(d.jm)}-${pad(d.jd)}`;
}

export function parseKey(key: string): JDate {
  const [jy, jm, jd] = key.split('-').map(Number);
  return { jy, jm, jd };
}

export function todayKey(): string {
  return dateKey(toJalaali(new Date()));
}

/** جابه‌جایی تاریخ شمسی به اندازهٔ n روز */
export function addDays(d: JDate, n: number): JDate {
  return d2j(j2d(d.jy, d.jm, d.jd) + n);
}

export function addKeyDays(key: string, n: number): string {
  return dateKey(addDays(parseKey(key), n));
}

/** فاصلهٔ روزها بین دو تاریخ شمسی (a - b) */
export function diffDays(a: JDate, b: JDate): number {
  return j2d(a.jy, a.jm, a.jd) - j2d(b.jy, b.jm, b.jd);
}

/* ------------------------------------------------------------------ */
/* روزهای هفته: هفتهٔ ایرانی از شنبه شروع می‌شود                          */
/* ------------------------------------------------------------------ */

export const WEEKDAYS = [
  'شنبه',
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
] as const;

export const WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;

export const MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

/** ۰ = شنبه … ۶ = جمعه */
export function weekdayIndex(d: JDate): number {
  // getDay(): ۰ = یک‌شنبهٔ میلادی، پس شنبه (۶) باید صفر شود
  return (toGregorian(d.jy, d.jm, d.jd).getDay() + 1) % 7;
}

export function weekdayIndexOfKey(key: string): number {
  return weekdayIndex(parseKey(key));
}

/** کلید شنبهٔ همان هفته */
export function startOfWeek(key: string): string {
  return addKeyDays(key, -weekdayIndexOfKey(key));
}

/** هفت کلید تاریخِ هفتهٔ شامل این روز، از شنبه تا جمعه */
export function weekKeys(key: string): string[] {
  const sat = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addKeyDays(sat, i));
}

/** شناسهٔ یکتای هفته برای ذخیره‌سازی، مثل «۱۴۰۵-۰۵-۲۳-w» */
export function weekId(key: string): string {
  return `${startOfWeek(key)}-w`;
}

export function monthId(key: string): string {
  const d = parseKey(key);
  return `${d.jy}-${pad(d.jm)}`;
}

/** همهٔ روزهای یک ماه شمسی */
export function monthKeys(jy: number, jm: number): string[] {
  const len = jalaaliMonthLength(jy, jm);
  return Array.from({ length: len }, (_, i) => dateKey({ jy, jm, jd: i + 1 }));
}

/**
 * تقسیم روزهای ماه به پنج «هفته» به سبک نمونه‌ها: چهار هفتهٔ هفت‌روزه و
 * هفتهٔ پنجم شامل باقی‌ماندهٔ ماه (روز ۲۹ به بعد). در اسفندِ غیرکبیسه
 * هفتهٔ پنجم فقط یک روز دارد.
 */
export function monthWeekBuckets(jy: number, jm: number): string[][] {
  const keys = monthKeys(jy, jm);
  return [
    keys.slice(0, 7),
    keys.slice(7, 14),
    keys.slice(14, 21),
    keys.slice(21, 28),
    keys.slice(28),
  ];
}

/** شمارهٔ هفتهٔ ماه (۰ تا ۴) برای یک روز */
export function monthWeekIndex(key: string): number {
  return Math.min(4, Math.floor((parseKey(key).jd - 1) / 7));
}

/* ------------------------------------------------------------------ */
/* قالب‌بندی                                                            */
/* ------------------------------------------------------------------ */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** تبدیل ارقام لاتین به فارسی */
export function fa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

/** جداکنندهٔ هزارگان با ارقام فارسی */
export function faNumber(value: number): string {
  return fa(Math.round(value).toLocaleString('en-US'));
}

/** «۲۴ مرداد ۱۴۰۵» */
export function formatLong(key: string): string {
  const d = parseKey(key);
  return `${fa(d.jd)} ${MONTHS[d.jm - 1]} ${fa(d.jy)}`;
}

/** «۱۴۰۵/۰۵/۲۴» */
export function formatShort(key: string): string {
  const d = parseKey(key);
  return fa(`${d.jy}/${pad(d.jm)}/${pad(d.jd)}`);
}

/** «شنبه ۲۴ مرداد» */
export function formatWithWeekday(key: string): string {
  const d = parseKey(key);
  return `${WEEKDAYS[weekdayIndex(d)]} ${fa(d.jd)} ${MONTHS[d.jm - 1]}`;
}

export function monthLabel(jy: number, jm: number): string {
  return `${MONTHS[jm - 1]} ${fa(jy)}`;
}
