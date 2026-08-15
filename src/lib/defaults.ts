import type { Habit, PlannerData, TaskTemplate } from './types.js';

export const DATA_VERSION = 1;

export function makeId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

/** رنگ‌های پاستلی هماهنگ با طرح پلنر */
export const HABIT_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#ec4899',
  '#f59e0b',
  '#8b5cf6',
  '#14b8a6',
  '#ef4444',
  '#0ea5e9',
];

const template = (
  title: string,
  category: TaskTemplate['category'],
  priority: TaskTemplate['priority'] = 'normal',
  weekdays: number[] = [],
): TaskTemplate => ({
  id: makeId('tpl'),
  title,
  category,
  priority,
  weekdays,
  active: true,
});

/** چک‌لیست پیش‌فرض عملیات روزانهٔ یک فروشگاه */
export function defaultTemplates(): TaskTemplate[] {
  return [
    template('روشن کردن چراغ‌ها و سیستم تهویه', 'open'),
    template('نظافت ویترین و کف فروشگاه', 'open', 'high'),
    template('شمارش صندوق و آمادگی دستگاه کارتخوان', 'open', 'high'),
    template('چیدمان و پر کردن قفسه‌های خالی', 'open'),
    template('بررسی قیمت‌ها و برچسب‌های جدید', 'open', 'low'),
    template('پاسخ به سفارش‌های آنلاین و پیام مشتری‌ها', 'during', 'high'),
    template('کنترل موجودی کالاهای پرفروش', 'during', 'high'),
    template('ثبت فروش‌های روز', 'during'),
    template('رسیدگی به مرجوعی و تعویض کالا', 'during', 'low'),
    template('تحویل گرفتن بار از تأمین‌کننده', 'during', 'normal', [0, 2, 4]),
    template('بستن صندوق و تطبیق فروش با موجودی', 'close', 'high'),
    template('ثبت هزینه‌های روز', 'close'),
    template('برنامهٔ سفارش کالای فردا', 'close'),
    template('خاموش کردن تجهیزات و قفل کردن درها', 'close', 'high'),
  ];
}

const habit = (
  title: string,
  emoji: string,
  freq: Habit['freq'],
  target: number,
  color: string,
): Habit => ({
  id: makeId('hbt'),
  title,
  emoji,
  freq,
  target,
  color,
  active: true,
});

/** عادت‌های عملیاتی فروشگاه که پیوستگی‌شان مهم است */
export function defaultHabits(): Habit[] {
  return [
    habit('نظافت کامل فروشگاه', '🧹', 'daily', 30, HABIT_COLORS[0]),
    habit('کنترل موجودی قفسه‌ها', '📦', 'daily', 30, HABIT_COLORS[1]),
    habit('ثبت فروش روزانه در دفتر', '🧾', 'daily', 30, HABIT_COLORS[2]),
    habit('پاسخ به همهٔ پیام‌های مشتری', '💬', 'daily', 26, HABIT_COLORS[3]),
    habit('انتشار محتوا در شبکهٔ اجتماعی', '📱', 'daily', 20, HABIT_COLORS[4]),
    habit('پیگیری کالای ناموجود', '🔎', 'daily', 24, HABIT_COLORS[5]),
    habit('سفارش هفتگی کالا به تأمین‌کننده', '🚚', 'weekly', 4, HABIT_COLORS[0]),
    habit('بررسی قیمت رقبا', '🏷️', 'weekly', 4, HABIT_COLORS[1]),
    habit('نظافت کامل انبار', '🧽', 'weekly', 4, HABIT_COLORS[2]),
    habit('جمع‌بندی فروش هفته', '📊', 'weekly', 4, HABIT_COLORS[3]),
    habit('انبارگردانی کامل', '📋', 'monthly', 1, HABIT_COLORS[0]),
    habit('تسویه حساب با تأمین‌کننده‌ها', '💳', 'monthly', 1, HABIT_COLORS[1]),
    habit('بررسی سود و زیان ماه', '📈', 'monthly', 1, HABIT_COLORS[2]),
  ];
}

export function defaultData(): PlannerData {
  return {
    version: DATA_VERSION,
    settings: {
      shopName: 'فروشگاه من',
      currency: 'تومان',
      openTime: '09:00',
      closeTime: '21:00',
      closedWeekdays: [6],
      saleCategories: ['فروش حضوری', 'فروش آنلاین', 'فروش عمده', 'سایر درآمد'],
      expenseCategories: [
        'خرید کالا',
        'اجاره',
        'حقوق پرسنل',
        'قبض و آب و برق',
        'تبلیغات',
        'حمل و نقل',
        'سایر هزینه',
      ],
    },
    templates: defaultTemplates(),
    habits: defaultHabits(),
    days: {},
    dailyLog: {},
    weeklyLog: {},
    monthlyLog: {},
    monthNotes: {},
    employees: [],
    attendance: {},
    finance: [],
  };
}
