import assert from 'node:assert/strict';
import {
  addKeyDays,
  dateKey,
  diffDays,
  formatLong,
  isLeapJalaaliYear,
  jalaaliMonthLength,
  monthWeekBuckets,
  monthWeekIndex,
  parseKey,
  startOfWeek,
  toGregorian,
  toJalaali,
  weekKeys,
  weekdayIndexOfKey,
  fa,
  faNumber,
} from './jalali.js';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log('jalali');

check('میلادی به شمسی', () => {
  assert.deepEqual(toJalaali(new Date(2026, 7, 15)), { jy: 1405, jm: 5, jd: 24 });
  assert.deepEqual(toJalaali(new Date(2026, 2, 21)), { jy: 1405, jm: 1, jd: 1 });
  assert.deepEqual(toJalaali(new Date(2024, 2, 19)), { jy: 1402, jm: 12, jd: 29 });
  assert.deepEqual(toJalaali(new Date(1979, 1, 11)), { jy: 1357, jm: 11, jd: 22 });
});

check('شمسی به میلادی', () => {
  const g = toGregorian(1405, 5, 24);
  assert.equal(g.getFullYear(), 2026);
  assert.equal(g.getMonth() + 1, 8);
  assert.equal(g.getDate(), 15);
});

check('رفت و برگشت برای ۵۰۰۰ روز پیاپی', () => {
  const start = new Date(2015, 0, 1);
  for (let i = 0; i < 5000; i += 1) {
    const g = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const j = toJalaali(g);
    const back = toGregorian(j.jy, j.jm, j.jd);
    assert.equal(back.getTime(), g.getTime(), `عدم تطابق در ${g.toDateString()}`);
  }
});

check('سال کبیسه و طول ماه', () => {
  assert.equal(isLeapJalaaliYear(1403), true);
  assert.equal(isLeapJalaaliYear(1405), false);
  assert.equal(jalaaliMonthLength(1405, 1), 31);
  assert.equal(jalaaliMonthLength(1405, 7), 30);
  assert.equal(jalaaliMonthLength(1405, 12), 29);
  assert.equal(jalaaliMonthLength(1403, 12), 30);
});

check('جمع و تفریق روز', () => {
  assert.equal(addKeyDays('1405-05-31', 1), '1405-06-01');
  assert.equal(addKeyDays('1405-06-31', 1), '1405-07-01');
  assert.equal(addKeyDays('1405-12-29', 1), '1406-01-01');
  assert.equal(addKeyDays('1406-01-01', -1), '1405-12-29');
  assert.equal(diffDays(parseKey('1405-05-24'), parseKey('1405-05-01')), 23);
});

check('روز هفته از شنبه شروع می‌شود', () => {
  // ۲۴ مرداد ۱۴۰۵ برابر شنبه ۱۵ اوت ۲۰۲۶ است
  assert.equal(weekdayIndexOfKey('1405-05-24'), 0);
  assert.equal(weekdayIndexOfKey('1405-05-25'), 1);
  assert.equal(weekdayIndexOfKey('1405-05-30'), 6);
});

check('هفته همیشه هفت روز از شنبه تا جمعه است', () => {
  const week = weekKeys('1405-05-27');
  assert.equal(week.length, 7);
  assert.equal(week[0], '1405-05-24');
  assert.equal(week[6], '1405-05-30');
  assert.equal(startOfWeek('1405-05-30'), '1405-05-24');
  assert.equal(weekdayIndexOfKey(week[0]), 0);
});

check('تقسیم ماه به پنج هفته همهٔ روزها را پوشش می‌دهد', () => {
  for (const jm of [1, 7, 12]) {
    const buckets = monthWeekBuckets(1405, jm);
    assert.equal(buckets.length, 5);
    const total = buckets.reduce((sum, b) => sum + b.length, 0);
    assert.equal(total, jalaaliMonthLength(1405, jm));
    // چهار هفتهٔ اول همیشه هفت‌روزه‌اند
    for (let i = 0; i < 4; i += 1) assert.equal(buckets[i].length, 7);
  }

  // مرداد ۳۱ روزه: هفتهٔ پنجم سه روز دارد
  assert.deepEqual(monthWeekBuckets(1405, 5)[4], ['1405-05-29', '1405-05-30', '1405-05-31']);
  // اسفند ۱۴۰۵ غیرکبیسه و ۲۹ روزه: هفتهٔ پنجم فقط یک روز
  assert.deepEqual(monthWeekBuckets(1405, 12)[4], ['1405-12-29']);
});

check('شمارهٔ هفتهٔ ماه', () => {
  assert.equal(monthWeekIndex('1405-05-01'), 0);
  assert.equal(monthWeekIndex('1405-05-07'), 0);
  assert.equal(monthWeekIndex('1405-05-08'), 1);
  assert.equal(monthWeekIndex('1405-05-28'), 3);
  assert.equal(monthWeekIndex('1405-05-29'), 4);
  assert.equal(monthWeekIndex('1405-05-31'), 4);
});

check('قالب‌بندی فارسی', () => {
  assert.equal(dateKey({ jy: 1405, jm: 5, jd: 4 }), '1405-05-04');
  assert.equal(formatLong('1405-05-24'), '۲۴ مرداد ۱۴۰۵');
  assert.equal(fa(1405), '۱۴۰۵');
  assert.equal(faNumber(1250000), '۱,۲۵۰,۰۰۰');
});

console.log(`\n${passed} تست تقویم با موفقیت اجرا شد.\n`);
