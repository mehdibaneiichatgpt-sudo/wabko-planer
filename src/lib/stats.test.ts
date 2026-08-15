import assert from 'node:assert/strict';
import { defaultData } from './defaults.js';
import { getDay } from './day.js';
import {
  byCategory,
  dayScore,
  habitMonthCount,
  habitStreaks,
  progress,
  summarize,
  taskProgress,
} from './stats.js';
import type { PlannerData } from './types.js';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function baseData(): PlannerData {
  const data = defaultData();
  data.templates = [];
  data.habits = [
    { id: 'h1', title: 'نظافت', emoji: '🧹', freq: 'daily', target: 30, color: '#000', active: true },
    { id: 'h2', title: 'موجودی', emoji: '📦', freq: 'daily', target: 30, color: '#000', active: true },
    { id: 'w1', title: 'سفارش', emoji: '🚚', freq: 'weekly', target: 4, color: '#000', active: true },
  ];
  return data;
}

console.log('stats');

check('درصد پیشرفت', () => {
  assert.deepEqual(progress(0, 0), { done: 0, total: 0, percent: 0 });
  assert.deepEqual(progress(3, 4), { done: 3, total: 4, percent: 75 });
});

check('پیشرفت کارهای روز', () => {
  const data = baseData();
  data.days['1405-05-24'] = {
    focus: '',
    note: '',
    staff: '',
    tasks: [
      { id: 't1', title: 'الف', category: 'open', priority: 'normal', done: true },
      { id: 't2', title: 'ب', category: 'open', priority: 'normal', done: false },
    ],
  };
  assert.deepEqual(taskProgress(data, '1405-05-24'), { done: 1, total: 2, percent: 50 });
  assert.deepEqual(taskProgress(data, '1405-05-25'), { done: 0, total: 0, percent: 0 });
});

check('روز ذخیره‌نشده چک‌لیستش از قالب‌ها ساخته می‌شود', () => {
  const data = defaultData();
  data.templates = [
    { id: 'a', title: 'هر روز', category: 'open', priority: 'normal', weekdays: [], active: true },
    { id: 'b', title: 'فقط شنبه', category: 'open', priority: 'normal', weekdays: [0], active: true },
    { id: 'c', title: 'غیرفعال', category: 'open', priority: 'normal', weekdays: [], active: false },
  ];
  // ۱۴۰۵-۰۵-۲۴ شنبه و ۱۴۰۵-۰۵-۲۵ یک‌شنبه است
  assert.deepEqual(getDay(data, '1405-05-24').tasks.map((t) => t.title), ['هر روز', 'فقط شنبه']);
  assert.deepEqual(getDay(data, '1405-05-25').tasks.map((t) => t.title), ['هر روز']);
  assert.equal(taskProgress(data, '1405-05-24').total, 2);
  // ساخت چک‌لیست موقت نباید چیزی در حافظه بنویسد
  assert.deepEqual(data.days, {});

  // ۱۴۰۵-۰۵-۳۰ جمعه است و طبق تنظیمات پیش‌فرض تعطیل
  data.settings.closedWeekdays = [6];
  assert.equal(getDay(data, '1405-05-30').tasks.length, 0);
});

check('نمرهٔ روز کارها و عادت‌ها را با هم می‌شمارد', () => {
  const data = baseData();
  data.days['1405-05-24'] = {
    focus: '',
    note: '',
    staff: '',
    tasks: [{ id: 't1', title: 'الف', category: 'open', priority: 'normal', done: true }],
  };
  data.dailyLog['1405-05-24'] = { h1: true };
  // ۱ کار از ۱ + ۱ عادت از ۲ = ۲ از ۳
  assert.deepEqual(dayScore(data, '1405-05-24'), { done: 2, total: 3, percent: 67 });
});

check('استریک فعلی و بیشترین استریک', () => {
  const data = baseData();
  for (const d of ['1405-05-20', '1405-05-21', '1405-05-22', '1405-05-24', '1405-05-25']) {
    data.dailyLog[d] = { h1: true };
  }
  const s = habitStreaks(data, 'h1', '1405-05-25');
  assert.equal(s.current, 2);
  assert.equal(s.longest, 3);
});

check('استریک با یک روز فاصله تا امروز حفظ می‌شود', () => {
  const data = baseData();
  for (const d of ['1405-05-23', '1405-05-24']) data.dailyLog[d] = { h1: true };
  // امروز ۲۵ هنوز تیک نخورده، پس از ۲۴ به عقب شمرده می‌شود
  assert.equal(habitStreaks(data, 'h1', '1405-05-25').current, 2);
  // اما دو روز فاصله یعنی استریک قطع شده است
  assert.equal(habitStreaks(data, 'h1', '1405-05-26').current, 0);
});

check('استریک روی مرز ماه و سال ادامه پیدا می‌کند', () => {
  const data = baseData();
  for (const d of ['1405-12-28', '1405-12-29', '1406-01-01']) data.dailyLog[d] = { h1: true };
  assert.equal(habitStreaks(data, 'h1', '1406-01-01').current, 3);
  assert.equal(habitStreaks(data, 'h1', '1406-01-01').longest, 3);
});

check('عادت بدون سابقه استریک صفر دارد', () => {
  assert.deepEqual(habitStreaks(baseData(), 'h2', '1405-05-25'), { current: 0, longest: 0 });
});

check('شمارش ماهانهٔ عادت روزانه و هفتگی', () => {
  const data = baseData();
  data.dailyLog['1405-05-01'] = { h1: true };
  data.dailyLog['1405-05-15'] = { h1: true };
  data.dailyLog['1405-06-02'] = { h1: true };
  assert.equal(habitMonthCount(data, data.habits[0], 1405, 5), 2);
  assert.equal(habitMonthCount(data, data.habits[0], 1405, 6), 1);

  // ۱۴۰۵-۰۵-۰۱ پنج‌شنبه است، پس شنبهٔ همان هفته ۱۴۰۵-۰۴-۲۷ می‌شود
  data.weeklyLog['1405-04-27-w'] = { w1: true };
  assert.equal(habitMonthCount(data, data.habits[2], 1405, 5), 1);
});

check('خلاصهٔ مالی و تفکیک دسته', () => {
  const data = baseData();
  data.finance = [
    { id: 'f1', date: '1405-05-24', type: 'sale', category: 'فروش حضوری', amount: 1_000_000, note: '' },
    { id: 'f2', date: '1405-05-24', type: 'sale', category: 'فروش آنلاین', amount: 500_000, note: '' },
    { id: 'f3', date: '1405-05-24', type: 'expense', category: 'خرید کالا', amount: 300_000, note: '' },
  ];
  const s = summarize(data.finance);
  assert.equal(s.sales, 1_500_000);
  assert.equal(s.expenses, 300_000);
  assert.equal(s.net, 1_200_000);

  const cats = byCategory(data.finance, 'sale');
  assert.deepEqual(cats, [
    { category: 'فروش حضوری', amount: 1_000_000 },
    { category: 'فروش آنلاین', amount: 500_000 },
  ]);
});

console.log(`\n${passed} تست آمار با موفقیت اجرا شد.\n`);
