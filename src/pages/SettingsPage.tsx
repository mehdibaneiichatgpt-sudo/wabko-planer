import { useRef, useState } from 'react';
import { makeId } from '../lib/defaults.js';
import { WEEKDAYS, fa } from '../lib/jalali.js';
import { clearData, exportData, importData } from '../lib/storage.js';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  PRIORITY_LABELS,
  type Priority,
  type TaskCategory,
} from '../lib/types.js';
import { usePlanner } from '../state/PlannerContext.js';

export function SettingsPage() {
  const { data, replaceData, saveTemplate, removeTemplate, updateSettings } = usePlanner();
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('open');
  const [priority, setPriority] = useState<Priority>('normal');
  const [weekdays, setWeekdays] = useState<number[]>([]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    saveTemplate({
      id: makeId('tpl'),
      title: clean,
      category,
      priority,
      weekdays: [...weekdays].sort(),
      active: true,
    });
    setTitle('');
    setWeekdays([]);
  };

  const toggleWeekday = (index: number, list: number[], apply: (next: number[]) => void) => {
    apply(list.includes(index) ? list.filter((d) => d !== index) : [...list, index]);
  };

  const handleImport = async (file: File) => {
    try {
      const next = await importData(file);
      replaceData(next);
      window.alert('اطلاعات با موفقیت بازیابی شد.');
    } catch {
      window.alert('خواندن فایل ناموفق بود. مطمئن شو فایل پشتیبان همین برنامه است.');
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>تنظیمات</h1>
          <p className="muted">قالب کارهای تکرارشونده و مشخصات فروشگاه</p>
        </div>
      </div>

      <section className="grid-two">
        <div className="card">
          <h2 className="card-title">مشخصات فروشگاه</h2>
          <label className="field-label" htmlFor="shop">
            نام فروشگاه
          </label>
          <input
            id="shop"
            className="input"
            value={data.settings.shopName}
            onChange={(e) => updateSettings({ shopName: e.target.value })}
          />

          <label className="field-label" htmlFor="currency">
            واحد پول
          </label>
          <input
            id="currency"
            className="input"
            value={data.settings.currency}
            onChange={(e) => updateSettings({ currency: e.target.value })}
          />

          <span className="field-label">روزهای تعطیل</span>
          <div className="weekday-picker">
            {WEEKDAYS.map((name, index) => (
              <button
                type="button"
                key={name}
                className={data.settings.closedWeekdays.includes(index) ? 'chip active' : 'chip'}
                onClick={() =>
                  toggleWeekday(index, data.settings.closedWeekdays, (next) =>
                    updateSettings({ closedWeekdays: next }),
                  )
                }
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">پشتیبان‌گیری</h2>
          <p className="muted">
            همهٔ اطلاعات فقط روی همین دستگاه و داخل مرورگر ذخیره می‌شود. برای انتقال به دستگاه
            دیگر یا نگهداری نسخهٔ امن، فایل پشتیبان بگیر.
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="primary-btn"
              onClick={() => exportData(data, `planer-backup-${Date.now()}.json`)}
            >
              دریافت فایل پشتیبان
            </button>
            <button type="button" className="ghost-btn" onClick={() => fileInput.current?.click()}>
              بازیابی از فایل
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImport(file);
                e.target.value = '';
              }}
            />
          </div>
          <button
            type="button"
            className="danger-btn"
            onClick={() => {
              if (window.confirm('همهٔ اطلاعات پاک شود؟ این کار برگشت‌پذیر نیست.')) {
                clearData();
                window.location.reload();
              }
            }}
          >
            پاک کردن همهٔ اطلاعات
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">قالب کارهای روزانه</h2>
        <p className="muted">
          این کارها هر روز به‌صورت خودکار در چک‌لیست ساخته می‌شوند. تغییر قالب روی روزهایی که
          قبلاً بازشان کرده‌ای اثری ندارد.
        </p>

        <div className="streak-table-wrap">
          <table className="entry-table">
            <thead>
              <tr>
                <th>عنوان</th>
                <th>بخش</th>
                <th>اهمیت</th>
                <th>روزها</th>
                <th>فعال</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.templates.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>{CATEGORY_LABELS[t.category]}</td>
                  <td>{PRIORITY_LABELS[t.priority]}</td>
                  <td className="note-cell">
                    {t.weekdays.length === 0
                      ? 'همهٔ روزها'
                      : t.weekdays.map((d) => WEEKDAYS[d]).join('، ')}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={t.active}
                      onChange={() => saveTemplate({ ...t, active: !t.active })}
                      aria-label={`فعال بودن ${t.title}`}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeTemplate(t.id)}
                      aria-label={`حذف ${t.title}`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="stacked-form" onSubmit={submit}>
          <h3 className="group-title">افزودن کار تکرارشونده</h3>
          <div className="inline-form">
            <input
              className="input"
              placeholder="عنوان کار…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className="input select"
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
            >
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <select
              className="input select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
            <button type="submit" className="primary-btn">
              افزودن
            </button>
          </div>
          <span className="field-label">
            روزهای تکرار {weekdays.length === 0 && <small className="muted">(خالی یعنی همهٔ روزها)</small>}
          </span>
          <div className="weekday-picker">
            {WEEKDAYS.map((name, index) => (
              <button
                type="button"
                key={name}
                className={weekdays.includes(index) ? 'chip active' : 'chip'}
                onClick={() => toggleWeekday(index, weekdays, setWeekdays)}
              >
                {name}
              </button>
            ))}
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="card-title">وضعیت اطلاعات</h2>
        <div className="stat-row">
          <div className="stat">
            <span className="stat-label">روزهای ثبت‌شده</span>
            <strong>{fa(Object.keys(data.days).length)}</strong>
          </div>
          <div className="stat">
            <span className="stat-label">عادت‌ها</span>
            <strong>{fa(data.habits.length)}</strong>
          </div>
          <div className="stat">
            <span className="stat-label">قالب‌ها</span>
            <strong>{fa(data.templates.length)}</strong>
          </div>
          <div className="stat">
            <span className="stat-label">رکوردهای مالی</span>
            <strong>{fa(data.finance.length)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
