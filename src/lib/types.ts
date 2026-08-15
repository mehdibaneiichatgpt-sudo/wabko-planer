export type TaskCategory = 'open' | 'during' | 'close' | 'other';
export type Priority = 'high' | 'normal' | 'low';
export type HabitFreq = 'daily' | 'weekly' | 'monthly';
export type EntryType = 'sale' | 'expense';

/** کار تکرارشونده‌ای که هر روز به‌صورت خودکار در چک‌لیست ساخته می‌شود */
export interface TaskTemplate {
  id: string;
  title: string;
  category: TaskCategory;
  priority: Priority;
  /** روزهای هفته (۰ شنبه … ۶ جمعه). خالی یعنی همهٔ روزها */
  weekdays: number[];
  active: boolean;
}

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  priority: Priority;
  done: boolean;
  /** اگر از روی قالب ساخته شده باشد */
  templateId?: string;
  /** شناسهٔ کارمندی که کار به او سپرده شده */
  assignee?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string;
  color: string;
  active: boolean;
}

/** ساعت‌های یک کارمند در یک روز، به شکل «HH:MM» */
export interface Attendance {
  in: string;
  lunchOut: string;
  lunchIn: string;
  out: string;
  note: string;
}

export interface DayRecord {
  focus: string;
  tasks: Task[];
  note: string;
  /** فروشندهٔ شیفت یا نکتهٔ پرسنلی */
  staff: string;
}

export interface Habit {
  id: string;
  title: string;
  emoji: string;
  freq: HabitFreq;
  /** هدف: تعداد دفعات در ماه برای روزانه، در ماه برای هفتگی/ماهانه */
  target: number;
  color: string;
  active: boolean;
}

export interface FinanceEntry {
  id: string;
  date: string;
  type: EntryType;
  category: string;
  amount: number;
  note: string;
}

export interface Settings {
  shopName: string;
  currency: string;
  /** روزهای تعطیل هفتگی (۰ شنبه … ۶ جمعه) */
  closedWeekdays: number[];
  saleCategories: string[];
  expenseCategories: string[];
}

export interface PlannerData {
  version: number;
  settings: Settings;
  templates: TaskTemplate[];
  habits: Habit[];
  /** کلید تاریخ شمسی → رکورد روز */
  days: Record<string, DayRecord>;
  /** عادت روزانه: کلید تاریخ → شناسهٔ عادت → انجام شد */
  dailyLog: Record<string, Record<string, boolean>>;
  /** عادت هفتگی: شناسهٔ هفته → شناسهٔ عادت → انجام شد */
  weeklyLog: Record<string, Record<string, boolean>>;
  /** عادت ماهانه: شناسهٔ ماه → شناسهٔ عادت → انجام شد */
  monthlyLog: Record<string, Record<string, boolean>>;
  /** یادداشت آزاد هر ماه: شناسهٔ ماه → متن */
  monthNotes: Record<string, string>;
  employees: Employee[];
  /** حضور و غیاب: کلید تاریخ → شناسهٔ کارمند → ساعت‌ها */
  attendance: Record<string, Record<string, Attendance>>;
  finance: FinanceEntry[];
}

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  open: 'باز کردن فروشگاه',
  during: 'در طول روز',
  close: 'بستن فروشگاه',
  other: 'کارهای دیگر',
};

export const CATEGORY_ORDER: TaskCategory[] = ['open', 'during', 'close', 'other'];

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'مهم',
  normal: 'عادی',
  low: 'کم‌اهمیت',
};

export const FREQ_LABELS: Record<HabitFreq, string> = {
  daily: 'روزانه',
  weekly: 'هفتگی',
  monthly: 'ماهانه',
};
