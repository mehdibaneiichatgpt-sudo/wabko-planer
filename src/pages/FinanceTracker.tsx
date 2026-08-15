import { useMemo, useState } from 'react';
import { BarChart, ProgressBar } from '../components/Charts.js';
import {
  MONTHS,
  fa,
  faNumber,
  formatShort,
  monthKeys,
  parseKey,
} from '../lib/jalali.js';
import { byCategory, entriesForMonth, summarize } from '../lib/stats.js';
import type { EntryType } from '../lib/types.js';
import { usePlanner } from '../state/PlannerContext.js';

export function FinanceTracker() {
  const { data, selected, setSelected, addEntry, removeEntry } = usePlanner();
  const view = parseKey(selected);

  const [type, setType] = useState<EntryType>('sale');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(data.settings.saleCategories[0] ?? '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(selected);

  const entries = useMemo(
    () => entriesForMonth(data, view.jy, view.jm),
    [data, view.jy, view.jm],
  );
  const totals = summarize(entries);
  const days = useMemo(() => monthKeys(view.jy, view.jm), [view.jy, view.jm]);

  const dailyBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (e.type !== 'sale') continue;
      map.set(e.date, (map.get(e.date) ?? 0) + e.amount);
    }
    return days.map((key) => ({
      label: fa(parseKey(key).jd),
      value: map.get(key) ?? 0,
      color: key === selected ? 'var(--brand)' : 'var(--brand-soft)',
    }));
  }, [days, entries, selected]);

  const saleCats = byCategory(entries, 'sale');
  const expenseCats = byCategory(entries, 'expense');
  const categories =
    type === 'sale' ? data.settings.saleCategories : data.settings.expenseCategories;

  const shiftMonth = (delta: number) => {
    let jm = view.jm + delta;
    let jy = view.jy;
    if (jm < 1) {
      jm = 12;
      jy -= 1;
    } else if (jm > 12) {
      jm = 1;
      jy += 1;
    }
    setSelected(`${jy}-${String(jm).padStart(2, '0')}-01`);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount.replace(/[^\d]/g, ''));
    if (!value) return;
    addEntry({
      date,
      type,
      category: category || categories[0] || 'سایر',
      amount: value,
      note: note.trim(),
    });
    setAmount('');
    setNote('');
  };

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const bestDay = dailyBars.reduce(
    (best, d) => (d.value > best.value ? d : best),
    { label: '—', value: 0 },
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>فروش و هزینه</h1>
          <p className="muted">گزارش ماهانهٔ {data.settings.shopName}</p>
        </div>
        <div className="datepicker-bar">
          <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="ماه قبل">
            ‹
          </button>
          <span className="date-display-main">
            {MONTHS[view.jm - 1]} {fa(view.jy)}
          </span>
          <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label="ماه بعد">
            ›
          </button>
        </div>
      </div>

      <section className="stat-cards">
        <div className="card stat-card pos-card">
          <span className="stat-label">فروش ماه</span>
          <strong>{faNumber(totals.sales)}</strong>
          <small>{data.settings.currency}</small>
        </div>
        <div className="card stat-card neg-card">
          <span className="stat-label">هزینهٔ ماه</span>
          <strong>{faNumber(totals.expenses)}</strong>
          <small>{data.settings.currency}</small>
        </div>
        <div className="card stat-card net-card">
          <span className="stat-label">سود خالص</span>
          <strong className={totals.net >= 0 ? 'pos' : 'neg'}>{faNumber(totals.net)}</strong>
          <small>{data.settings.currency}</small>
        </div>
        <div className="card stat-card">
          <span className="stat-label">بهترین روز</span>
          <strong>{faNumber(bestDay.value)}</strong>
          <small>روز {bestDay.label}</small>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">فروش روزانهٔ ماه</h2>
        <BarChart data={dailyBars} unit="amount" height={150} />
      </section>

      <section className="grid-two">
        <div className="card">
          <h2 className="card-title">ثبت فروش یا هزینه</h2>
          <form className="stacked-form" onSubmit={submit}>
            <div className="toggle-row">
              <button
                type="button"
                className={type === 'sale' ? 'toggle active' : 'toggle'}
                onClick={() => {
                  setType('sale');
                  setCategory(data.settings.saleCategories[0] ?? '');
                }}
              >
                فروش
              </button>
              <button
                type="button"
                className={type === 'expense' ? 'toggle active danger' : 'toggle'}
                onClick={() => {
                  setType('expense');
                  setCategory(data.settings.expenseCategories[0] ?? '');
                }}
              >
                هزینه
              </button>
            </div>

            <label className="field-label" htmlFor="fin-amount">
              مبلغ ({data.settings.currency})
            </label>
            <input
              id="fin-amount"
              className="input"
              inputMode="numeric"
              placeholder="۰"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <label className="field-label" htmlFor="fin-cat">
              دسته
            </label>
            <select
              id="fin-cat"
              className="input select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <label className="field-label" htmlFor="fin-date">
              تاریخ (شمسی)
            </label>
            <select
              id="fin-date"
              className="input select"
              value={days.includes(date) ? date : days[0]}
              onChange={(e) => setDate(e.target.value)}
            >
              {days.map((key) => (
                <option key={key} value={key}>
                  {formatShort(key)}
                </option>
              ))}
            </select>

            <label className="field-label" htmlFor="fin-note">
              توضیح
            </label>
            <input
              id="fin-note"
              className="input"
              placeholder="اختیاری"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <button type="submit" className="primary-btn full">
              ثبت
            </button>
          </form>
        </div>

        <div className="stack">
          <div className="card">
            <h2 className="card-title">فروش به تفکیک دسته</h2>
            {saleCats.length === 0 && <p className="muted">هنوز فروشی ثبت نشده است.</p>}
            {saleCats.map((c) => (
              <div className="cat-row" key={c.category}>
                <div className="cat-head">
                  <span>{c.category}</span>
                  <strong>{faNumber(c.amount)}</strong>
                </div>
                <ProgressBar
                  percent={totals.sales === 0 ? 0 : (c.amount / totals.sales) * 100}
                  color="#22c55e"
                />
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="card-title">هزینه به تفکیک دسته</h2>
            {expenseCats.length === 0 && <p className="muted">هنوز هزینه‌ای ثبت نشده است.</p>}
            {expenseCats.map((c) => (
              <div className="cat-row" key={c.category}>
                <div className="cat-head">
                  <span>{c.category}</span>
                  <strong>{faNumber(c.amount)}</strong>
                </div>
                <ProgressBar
                  percent={totals.expenses === 0 ? 0 : (c.amount / totals.expenses) * 100}
                  color="#ef4444"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">ثبت‌های ماه</h2>
        {sorted.length === 0 && <p className="muted">رکوردی برای این ماه وجود ندارد.</p>}
        {sorted.length > 0 && (
          <div className="streak-table-wrap">
            <table className="entry-table">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>نوع</th>
                  <th>دسته</th>
                  <th>مبلغ</th>
                  <th>توضیح</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => (
                  <tr key={e.id}>
                    <td>{formatShort(e.date)}</td>
                    <td>
                      <span className={e.type === 'sale' ? 'tag tag-pos' : 'tag tag-neg'}>
                        {e.type === 'sale' ? 'فروش' : 'هزینه'}
                      </span>
                    </td>
                    <td>{e.category}</td>
                    <td className={e.type === 'sale' ? 'pos' : 'neg'}>{faNumber(e.amount)}</td>
                    <td className="note-cell">{e.note || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeEntry(e.id)}
                        aria-label="حذف رکورد"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
