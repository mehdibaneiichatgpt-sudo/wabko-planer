import assert from 'node:assert/strict';
import {
  anchoredTime,
  averageOf,
  averageTime,
  formatClock,
  formatDuration,
  formatTime,
  isPresent,
  lunchMinutes,
  parseTime,
  toHours,
  workedMinutes,
} from './time.js';
import type { Attendance } from './types.js';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

const rec = (over: Partial<Attendance> = {}): Attendance => ({
  in: '',
  lunchOut: '',
  lunchIn: '',
  out: '',
  note: '',
  ...over,
});

console.log('time');

check('خواندن ساعت', () => {
  assert.equal(parseTime('08:30'), 510);
  assert.equal(parseTime('8:30'), 510);
  assert.equal(parseTime('۰۸:۳۰'), 510);
  assert.equal(parseTime('00:00'), 0);
  assert.equal(parseTime('23:59'), 1439);
  assert.equal(parseTime(''), null);
  assert.equal(parseTime('24:00'), null);
  assert.equal(parseTime('12:60'), null);
  assert.equal(parseTime('نامعتبر'), null);
});

check('نوشتن ساعت', () => {
  assert.equal(formatTime(510), '08:30');
  assert.equal(formatTime(0), '00:00');
});

check('کارکرد ساده', () => {
  // ۰۹:۰۰ تا ۱۸:۰۰ با یک ساعت نهار
  const r = rec({ in: '09:00', out: '18:00', lunchOut: '13:00', lunchIn: '14:00' });
  assert.equal(workedMinutes(r), 8 * 60);
  assert.equal(lunchMinutes(r), 60);
  assert.equal(formatDuration(workedMinutes(r)), '۸ ساعت');
});

check('بدون ثبت نهار، کل بازه کارکرد است', () => {
  assert.equal(workedMinutes(rec({ in: '09:00', out: '17:30' })), 510);
  assert.equal(formatDuration(510), '۸ ساعت و ۳۰ دقیقه');
});

check('نهار نیمه‌ثبت‌شده نادیده گرفته می‌شود', () => {
  const r = rec({ in: '09:00', out: '17:00', lunchOut: '13:00' });
  assert.equal(lunchMinutes(r), 0);
  assert.equal(workedMinutes(r), 8 * 60);
});

check('شیفت شب که از نیمه‌شب رد می‌شود', () => {
  // ورود ۱۶:۰۰ و خروج ۰۱:۰۰ یعنی ۹ ساعت
  assert.equal(workedMinutes(rec({ in: '16:00', out: '01:00' })), 9 * 60);
  // نهار ۲۳:۳۰ تا ۰۰:۱۵ هم باید درست حساب شود
  const r = rec({ in: '16:00', out: '01:00', lunchOut: '23:30', lunchIn: '00:15' });
  assert.equal(lunchMinutes(r), 45);
  assert.equal(workedMinutes(r), 9 * 60 - 45);
});

check('رکورد ناقص کارکرد صفر دارد', () => {
  assert.equal(workedMinutes(rec({ in: '09:00' })), 0);
  assert.equal(workedMinutes(rec({ out: '18:00' })), 0);
  assert.equal(workedMinutes(undefined), 0);
  assert.equal(formatDuration(0), '—');
});

check('نهار طولانی‌تر از شیفت کارکرد را منفی نمی‌کند', () => {
  const r = rec({ in: '09:00', out: '10:00', lunchOut: '12:00', lunchIn: '15:00' });
  assert.equal(workedMinutes(r), 0);
});

check('حاضر بودن با ثبت ساعت ورود مشخص می‌شود', () => {
  assert.equal(isPresent(rec({ in: '09:00' })), true);
  assert.equal(isPresent(rec({ out: '18:00' })), false);
  assert.equal(isPresent(undefined), false);
});

check('تبدیل به ساعت اعشاری', () => {
  assert.equal(toHours(510), 8.5);
  assert.equal(toHours(0), 0);
});

check('لنگر انداختن ساعت‌ها به ورود', () => {
  const day = rec({ in: '09:00', lunchOut: '13:00', lunchIn: '13:45', out: '18:30' });
  assert.equal(anchoredTime(day, 'in'), 9 * 60);
  assert.equal(anchoredTime(day, 'lunchOut'), 13 * 60);
  assert.equal(anchoredTime(day, 'out'), 18 * 60 + 30);

  // شیفت شب: خروج ۰۱:۰۰ باید ۲۵:۰۰ حساب شود، نه ۰۱:۰۰
  const night = rec({ in: '16:00', lunchOut: '23:30', lunchIn: '00:15', out: '01:00' });
  assert.equal(anchoredTime(night, 'out'), 25 * 60);
  assert.equal(anchoredTime(night, 'lunchIn'), 24 * 60 + 15);
  assert.equal(anchoredTime(night, 'lunchOut'), 23 * 60 + 30);

  assert.equal(anchoredTime(rec(), 'out'), null);
  assert.equal(anchoredTime(undefined, 'in'), null);
});

check('میانگین ساعت', () => {
  assert.equal(averageTime([]), null);
  assert.equal(averageTime([9 * 60, 10 * 60]), 9 * 60 + 30);
  assert.equal(formatClock(averageTime([9 * 60, 10 * 60])), '۰۹:۳۰');
  assert.equal(formatClock(null), '—');

  // میانگین خروج شیفت شب باید بعد از نیمه‌شب بیفتد، نه ظهر
  const nights = [25 * 60, 24 * 60 + 30];
  assert.equal(formatClock(averageTime(nights)), '۰۰:۴۵');
});

check('میانگین ساده', () => {
  assert.equal(averageOf([]), 0);
  assert.equal(averageOf([480, 510, 540]), 510);
});

console.log(`\n${passed} تست زمان با موفقیت اجرا شد.\n`);
