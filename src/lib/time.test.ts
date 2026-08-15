import assert from 'node:assert/strict';
import {
  anchoredTime,
  attendanceIssue,
  isOvernightShop,
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

check('شیفت شب فقط برای فروشگاه بعد از نیمه‌شب حساب می‌شود', () => {
  const night = rec({ in: '16:00', out: '01:00' });
  // فروشگاهی که تا ۰۲:۰۰ باز است: ۹ ساعت
  assert.equal(workedMinutes(night, true), 9 * 60);
  // فروشگاهی که ۲۱:۰۰ می‌بندد: این ورودی اشتباه است، نه شیفت ۹ ساعته
  assert.equal(workedMinutes(night), 0);

  const r = rec({ in: '16:00', out: '01:00', lunchOut: '23:30', lunchIn: '00:15' });
  assert.equal(lunchMinutes(r, true), 45);
  assert.equal(workedMinutes(r, true), 9 * 60 - 45);
});

check('تشخیص ساعت کاری شبانه', () => {
  assert.equal(isOvernightShop('09:00', '21:00'), false);
  assert.equal(isOvernightShop('16:00', '02:00'), true);
  assert.equal(isOvernightShop('', ''), false);
});

check('خطای خروج قبل از ورود', () => {
  const hours = { openTime: '09:00', closeTime: '21:00' };
  // اشتباه تایپی رایج: ۰۸:۰۰ به‌جای ۱۸:۰۰
  const typo = rec({ in: '09:00', out: '08:00' });
  const issue = attendanceIssue(typo, hours);
  assert.equal(issue?.level, 'error');
  assert.equal(issue?.message, 'خروج قبل از ورود است');
  // و کارکرد نباید ۲۳ ساعت شود
  assert.equal(workedMinutes(typo), 0);

  // همین ورودی برای فروشگاه شبانه ایراد ندارد
  assert.equal(attendanceIssue(typo, { openTime: '16:00', closeTime: '02:00' }), null);
});

check('خطاهای ترتیب نهار', () => {
  const hours = { openTime: '09:00', closeTime: '21:00' };
  assert.equal(
    attendanceIssue(rec({ in: '09:00', lunchOut: '08:00' }), hours)?.message,
    'نهار قبل از ورود است',
  );
  assert.equal(
    attendanceIssue(rec({ in: '09:00', lunchOut: '14:00', lunchIn: '13:00' }), hours)?.message,
    'برگشت از نهار قبل از رفتن است',
  );
  assert.equal(
    attendanceIssue(rec({ in: '09:00', lunchOut: '13:00', lunchIn: '19:00', out: '18:00' }), hours)
      ?.message,
    'برگشت از نهار بعد از خروج است',
  );
  assert.equal(
    attendanceIssue(rec({ out: '18:00' }), hours)?.message,
    'ساعت ورود ثبت نشده',
  );
});

check('هشدار بیرون از ساعت کاری', () => {
  const hours = { openTime: '09:00', closeTime: '21:00' };
  const late = attendanceIssue(rec({ in: '09:00', out: '22:30' }), hours);
  assert.equal(late?.level, 'warn');
  assert.deepEqual(late?.fields, ['out']);

  const early = attendanceIssue(rec({ in: '07:00', out: '15:00' }), hours);
  assert.equal(early?.level, 'warn');
  assert.deepEqual(early?.fields, ['in']);

  // شیفت داخل ساعت کاری هیچ ایرادی ندارد
  assert.equal(attendanceIssue(rec({ in: '09:00', out: '18:00' }), hours), null);
  assert.equal(attendanceIssue(rec(), hours), null);
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
