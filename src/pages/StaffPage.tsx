import { useMemo, useState } from 'react';
import { RankChart } from '../components/Charts.js';
import { DatePicker } from '../components/DatePicker.js';
import { TimeInput } from '../components/TimeInput.js';
import { HABIT_COLORS, makeId } from '../lib/defaults.js';
import { getDay } from '../lib/day.js';
import { MONTHS, fa, formatShort, monthKeys, parseKey } from '../lib/jalali.js';
import {
  anchoredTime,
  averageOf,
  averageTime,
  formatClock,
  formatDuration,
  isPresent,
  lunchMinutes,
  toHours,
  workedMinutes,
  type TimeField,
} from '../lib/time.js';
import type { Employee } from '../lib/types.js';
import { usePlanner } from '../state/PlannerContext.js';

/** ستون‌های ساعت‌زنی، به ترتیبی که در طول روز اتفاق می‌افتند */
const TIME_FIELDS: { key: TimeField; label: string }[] = [
  { key: 'in', label: 'ورود' },
  { key: 'lunchOut', label: 'رفتن به نهار' },
  { key: 'lunchIn', label: 'برگشت از نهار' },
  { key: 'out', label: 'خروج' },
];

export function StaffPage() {
  const { data, selected, today, setSelected, saveEmployee, removeEmployee, setAttendance } =
    usePlanner();
  const view = parseKey(selected);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');

  const employees = data.employees;
  const activeEmployees = employees.filter((e) => e.active);
  const dayAttendance = data.attendance[selected] ?? {};
  const monthDays = useMemo(() => monthKeys(view.jy, view.jm), [view.jy, view.jm]);

  /** جمع‌بندی ماهانهٔ هر کارمند: روزهای حضور، کارکرد و میانگین ساعت‌ها */
  const monthly = useMemo(
    () =>
      employees.map((employee) => {
        const clocks: Record<TimeField, number[]> = { in: [], lunchOut: [], lunchIn: [], out: [] };
        const worked: number[] = [];
        const lunches: number[] = [];
        let minutes = 0;
        let days = 0;

        for (const key of monthDays) {
          const record = data.attendance[key]?.[employee.id];
          if (!isPresent(record)) continue;
          days += 1;

          const shift = workedMinutes(record);
          minutes += shift;
          if (shift > 0) worked.push(shift);

          const lunch = lunchMinutes(record);
          if (lunch > 0) lunches.push(lunch);

          for (const field of TIME_FIELDS) {
            const value = anchoredTime(record, field.key);
            if (value !== null) clocks[field.key].push(value);
          }
        }

        return {
          employee,
          days,
          minutes,
          clocks,
          worked,
          lunches,
          average: averageOf(worked),
          averageLunch: averageOf(lunches),
          avgTimes: {
            in: averageTime(clocks.in),
            lunchOut: averageTime(clocks.lunchOut),
            lunchIn: averageTime(clocks.lunchIn),
            out: averageTime(clocks.out),
          },
        };
      }),
    [data.attendance, employees, monthDays],
  );

  /** همان میانگین‌ها، این بار برای کل فروشگاه */
  const shopAverages = useMemo(() => {
    const clocks: Record<TimeField, number[]> = { in: [], lunchOut: [], lunchIn: [], out: [] };
    const worked: number[] = [];
    const lunches: number[] = [];

    for (const row of monthly) {
      for (const field of TIME_FIELDS) clocks[field.key].push(...row.clocks[field.key]);
      worked.push(...row.worked);
      lunches.push(...row.lunches);
    }

    return {
      in: averageTime(clocks.in),
      lunchOut: averageTime(clocks.lunchOut),
      lunchIn: averageTime(clocks.lunchIn),
      out: averageTime(clocks.out),
      worked: averageOf(worked),
      lunch: averageOf(lunches),
      days: worked.length,
    };
  }, [monthly]);

  /** کارهای امروز که به هر کارمند سپرده شده */
  const assignedToday = useMemo(() => {
    const tasks = getDay(data, selected).tasks;
    const map = new Map<string, { done: number; total: number }>();
    for (const task of tasks) {
      if (!task.assignee) continue;
      const entry = map.get(task.assignee) ?? { done: 0, total: 0 };
      entry.total += 1;
      if (task.done) entry.done += 1;
      map.set(task.assignee, entry);
    }
    return map;
  }, [data, selected]);

  const presentCount = activeEmployees.filter((e) => isPresent(dayAttendance[e.id])).length;
  const dayMinutes = activeEmployees.reduce(
    (sum, e) => sum + workedMinutes(dayAttendance[e.id]),
    0,
  );

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

  const addEmployee = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const employee: Employee = {
      id: makeId('emp'),
      name: clean,
      role: role.trim(),
      phone: phone.trim(),
      color: HABIT_COLORS[employees.length % HABIT_COLORS.length],
      active: true,
    };
    saveEmployee(employee);
    setName('');
    setRole('');
    setPhone('');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>کارکنان</h1>
          <p className="muted">ثبت ساعت ورود و خروج، نهار و کارکرد خالص</p>
        </div>
        <DatePicker value={selected} today={today} onChange={setSelected} />
      </div>

      {employees.length === 0 && (
        <div className="banner">
          هنوز کارمندی ثبت نشده. از فرم «افزودن کارمند» پایین صفحه شروع کن؛ بعد از آن جدول
          حضور و غیاب همین‌جا باز می‌شود.
        </div>
      )}

      {activeEmployees.length > 0 && (
        <>
          <section className="stat-cards">
            <div className="card stat-card">
              <span className="stat-label">حاضران امروز</span>
              <strong>
                {fa(presentCount)} از {fa(activeEmployees.length)}
              </strong>
              <small>{formatShort(selected)}</small>
            </div>
            <div className="card stat-card pos-card">
              <span className="stat-label">مجموع کارکرد روز</span>
              <strong>{formatDuration(dayMinutes)}</strong>
              <small>همهٔ کارکنان</small>
            </div>
            <div className="card stat-card net-card">
              <span className="stat-label">کارکرد ماه</span>
              <strong>{fa(toHours(monthly.reduce((s, m) => s + m.minutes, 0)))} ساعت</strong>
              <small>
                {MONTHS[view.jm - 1]} {fa(view.jy)}
              </small>
            </div>
            <div className="card stat-card">
              <span className="stat-label">کارکنان فعال</span>
              <strong>{fa(activeEmployees.length)}</strong>
              <small>از {fa(employees.length)} نفر</small>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2 className="card-title">
                میانگین‌های فروشگاه در {MONTHS[view.jm - 1]} {fa(view.jy)}
              </h2>
              <span className="group-count">
                از {fa(shopAverages.days)} شیفت ثبت‌شده
              </span>
            </div>
            <div className="stat-row average-row">
              <div className="stat">
                <span className="stat-label">میانگین اومدن سر کار</span>
                <strong className="clock">{formatClock(shopAverages.in)}</strong>
              </div>
              <div className="stat">
                <span className="stat-label">میانگین رفتن به نهار</span>
                <strong className="clock">{formatClock(shopAverages.lunchOut)}</strong>
              </div>
              <div className="stat">
                <span className="stat-label">میانگین برگشت از نهار</span>
                <strong className="clock">{formatClock(shopAverages.lunchIn)}</strong>
              </div>
              <div className="stat">
                <span className="stat-label">میانگین خروج</span>
                <strong className="clock">{formatClock(shopAverages.out)}</strong>
              </div>
              <div className="stat">
                <span className="stat-label">میانگین مدت نهار</span>
                <strong>{formatDuration(shopAverages.lunch)}</strong>
              </div>
              <div className="stat highlight-stat">
                <span className="stat-label">میانگین ساعت کار</span>
                <strong className="pos">{formatDuration(shopAverages.worked)}</strong>
              </div>
            </div>
          </section>

          <section className="card scroll-card">
            <div className="card-head">
              <h2 className="card-title">حضور و غیاب {formatShort(selected)}</h2>
              <span className="group-count">ساعت‌ها را به شکل ۰۹:۳۰ وارد کن</span>
            </div>
            <div className="streak-table-wrap">
              <table className="entry-table attendance-table">
                <thead>
                  <tr>
                    <th>کارمند</th>
                    {TIME_FIELDS.map((f) => (
                      <th key={f.key}>{f.label}</th>
                    ))}
                    <th>نهار</th>
                    <th>کارکرد خالص</th>
                    <th>کارهای سپرده‌شده</th>
                    <th>یادداشت</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEmployees.map((employee) => {
                    const record = dayAttendance[employee.id];
                    const assigned = assignedToday.get(employee.id);
                    const worked = workedMinutes(record);
                    return (
                      <tr key={employee.id}>
                        <th>
                          <span className="dot" style={{ background: employee.color }} />
                          {employee.name}
                          {employee.role && <span className="freq-chip">{employee.role}</span>}
                        </th>
                        {TIME_FIELDS.map((f) => (
                          <td key={f.key}>
                            <TimeInput
                              value={record?.[f.key] ?? ''}
                              onChange={(v) => setAttendance(selected, employee.id, { [f.key]: v })}
                              label={`${f.label} ${employee.name}`}
                            />
                          </td>
                        ))}
                        <td className="muted">{formatDuration(lunchMinutes(record))}</td>
                        <td className={worked > 0 ? 'pos' : undefined}>{formatDuration(worked)}</td>
                        <td>
                          {assigned ? (
                            <span className="group-count">
                              {fa(assigned.done)}/{fa(assigned.total)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <input
                            className="input input-sm"
                            placeholder="تأخیر، مرخصی…"
                            value={record?.note ?? ''}
                            onChange={(e) =>
                              setAttendance(selected, employee.id, { note: e.target.value })
                            }
                            aria-label={`یادداشت ${employee.name}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid-two">
            <div className="card">
              <div className="card-head">
                <h2 className="card-title">گزارش ماهانه</h2>
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
              <div className="streak-table-wrap">
                <table className="entry-table attendance-table">
                  <thead>
                    <tr>
                      <th>کارمند</th>
                      <th>روزهای حضور</th>
                      <th>میانگین ورود</th>
                      <th>میانگین رفتن به نهار</th>
                      <th>میانگین برگشت</th>
                      <th>میانگین خروج</th>
                      <th>میانگین نهار</th>
                      <th>میانگین کار روزانه</th>
                      <th>کارکرد ماه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((row) => (
                      <tr key={row.employee.id}>
                        <th>
                          <span className="dot" style={{ background: row.employee.color }} />
                          {row.employee.name}
                        </th>
                        <td>{fa(row.days)}</td>
                        <td className="clock">{formatClock(row.avgTimes.in)}</td>
                        <td className="clock">{formatClock(row.avgTimes.lunchOut)}</td>
                        <td className="clock">{formatClock(row.avgTimes.lunchIn)}</td>
                        <td className="clock">{formatClock(row.avgTimes.out)}</td>
                        <td className="muted">{formatDuration(row.averageLunch)}</td>
                        <td className="muted">{formatDuration(row.average)}</td>
                        <td className={row.minutes > 0 ? 'pos' : undefined}>
                          {fa(toHours(row.minutes))} ساعت
                        </td>
                      </tr>
                    ))}
                    {monthly.length > 1 && (
                      <tr className="summary-row">
                        <th>میانگین فروشگاه</th>
                        <td>{fa(shopAverages.days)}</td>
                        <td className="clock">{formatClock(shopAverages.in)}</td>
                        <td className="clock">{formatClock(shopAverages.lunchOut)}</td>
                        <td className="clock">{formatClock(shopAverages.lunchIn)}</td>
                        <td className="clock">{formatClock(shopAverages.out)}</td>
                        <td>{formatDuration(shopAverages.lunch)}</td>
                        <td>{formatDuration(shopAverages.worked)}</td>
                        <td className="pos">
                          {fa(toHours(monthly.reduce((s, r) => s + r.minutes, 0)))} ساعت
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h2 className="card-title">کارکرد ماه به تفکیک کارمند</h2>
              <RankChart
                data={monthly
                  .map((row) => ({
                    label: row.employee.name,
                    value: toHours(row.minutes),
                    color: row.employee.color,
                  }))
                  .sort((a, b) => b.value - a.value)}
              />
            </div>
          </section>
        </>
      )}

      <section className="card">
        <h2 className="card-title">فهرست کارکنان</h2>
        {employees.length > 0 && (
          <div className="streak-table-wrap">
            <table className="entry-table">
              <thead>
                <tr>
                  <th>نام</th>
                  <th>سِمت</th>
                  <th>شماره تماس</th>
                  <th>فعال</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <span className="name-cell">
                        <span className="dot" style={{ background: employee.color }} />
                        <input
                          className="input input-inline"
                          value={employee.name}
                          onChange={(e) => saveEmployee({ ...employee, name: e.target.value })}
                          aria-label={`نام ${employee.name}`}
                        />
                      </span>
                    </td>
                    <td>
                      <input
                        className="input input-inline"
                        placeholder="فروشنده، صندوق‌دار…"
                        value={employee.role}
                        onChange={(e) => saveEmployee({ ...employee, role: e.target.value })}
                        aria-label={`سمت ${employee.name}`}
                      />
                    </td>
                    <td>
                      <input
                        className="input input-inline"
                        inputMode="tel"
                        value={employee.phone}
                        onChange={(e) => saveEmployee({ ...employee, phone: e.target.value })}
                        aria-label={`شماره ${employee.name}`}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={employee.active}
                        onChange={() => saveEmployee({ ...employee, active: !employee.active })}
                        aria-label={`فعال بودن ${employee.name}`}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => {
                          if (
                            window.confirm(
                              `«${employee.name}» حذف شود؟ ساعت‌های ثبت‌شده‌اش هم پاک می‌شوند.`,
                            )
                          ) {
                            removeEmployee(employee.id);
                          }
                        }}
                        aria-label={`حذف ${employee.name}`}
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

        <form className="inline-form" onSubmit={addEmployee}>
          <input
            className="input"
            placeholder="نام کارمند…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="سِمت (اختیاری)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <input
            className="input"
            inputMode="tel"
            placeholder="شماره تماس (اختیاری)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button type="submit" className="primary-btn">
            افزودن کارمند
          </button>
        </form>
        <p className="muted">
          کارمندی که «فعال» نباشد از جدول حضور و غیاب و فهرست سپردن کار حذف می‌شود، ولی سابقهٔ
          ساعت‌هایش می‌ماند.
        </p>
      </section>
    </div>
  );
}
