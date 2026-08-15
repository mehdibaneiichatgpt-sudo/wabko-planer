import { useMemo, useState } from 'react';
import { BarChart, Donut } from '../components/Charts.js';
import { DatePicker } from '../components/DatePicker.js';
import { TimeInput } from '../components/TimeInput.js';
import { getDay } from '../lib/day.js';
import {
  WEEKDAYS_SHORT,
  fa,
  faNumber,
  formatLong,
  weekKeys,
  weekdayIndexOfKey,
} from '../lib/jalali.js';
import {
  activeHabits,
  dailyHabitProgress,
  dayScore,
  entriesForDay,
  habitStreaks,
  summarize,
  taskProgress,
} from '../lib/stats.js';
import { attendanceIssue, formatDuration, isOvernightShop, isPresent, workedMinutes } from '../lib/time.js';
import { CATEGORY_LABELS, CATEGORY_ORDER, type TaskCategory } from '../lib/types.js';
import { usePlanner } from '../state/PlannerContext.js';

export function DailyDashboard() {
  const {
    data,
    selected,
    today,
    setSelected,
    updateDay,
    toggleTask,
    addTask,
    removeTask,
    resetDayFromTemplates,
    toggleHabit,
    addEntry,
    assignTask,
    setAttendance,
  } = usePlanner();

  const activeEmployees = data.employees.filter((e) => e.active);

  const [newTask, setNewTask] = useState('');
  const [newTaskCat, setNewTaskCat] = useState<TaskCategory>('during');
  const [saleAmount, setSaleAmount] = useState('');

  const day = getDay(data, selected);
  const tasks = taskProgress(data, selected);
  const habitsProgress = dailyHabitProgress(data, selected);
  const score = dayScore(data, selected);
  const dailyHabits = activeHabits(data, 'daily');
  const money = summarize(entriesForDay(data, selected));
  const isClosed = data.settings.closedWeekdays.includes(weekdayIndexOfKey(selected));
  const attendanceToday = data.attendance[selected] ?? {};
  const shopHours = { openTime: data.settings.openTime, closeTime: data.settings.closeTime };
  const overnight = isOvernightShop(shopHours.openTime, shopHours.closeTime);

  const weekBars = useMemo(
    () =>
      weekKeys(selected).map((key) => ({
        label: WEEKDAYS_SHORT[weekdayIndexOfKey(key)],
        sub: fa(Number(key.slice(-2))),
        value: dayScore(data, key).percent,
        color: key === selected ? 'var(--brand)' : 'var(--brand-soft)',
        highlight: key === selected,
      })),
    [data, selected],
  );

  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        items: day.tasks.filter((t) => t.category === category),
      })).filter((g) => g.items.length > 0),
    [day.tasks],
  );

  const submitTask = (event: React.FormEvent) => {
    event.preventDefault();
    addTask(selected, newTask, newTaskCat);
    setNewTask('');
  };

  const submitSale = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(saleAmount.replace(/[^\d]/g, ''));
    if (!amount) return;
    addEntry({
      date: selected,
      type: 'sale',
      category: data.settings.saleCategories[0] ?? 'فروش حضوری',
      amount,
      note: 'ثبت سریع از داشبورد',
    });
    setSaleAmount('');
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>داشبورد روزانه</h1>
          <p className="muted">{formatLong(selected)}</p>
        </div>
        <DatePicker value={selected} today={today} onChange={setSelected} />
      </div>

      {isClosed && (
        <div className="banner">امروز طبق تنظیمات، روز تعطیل فروشگاه است.</div>
      )}

      <section className="grid-hero">
        <div className="card focus-card">
          <label className="field-label" htmlFor="focus">
            تمرکز اصلی امروز
          </label>
          <input
            id="focus"
            className="input input-lg"
            placeholder="مثلاً: چیدمان قفسهٔ جدید و تماس با تأمین‌کننده"
            value={day.focus}
            onChange={(e) => updateDay(selected, { focus: e.target.value })}
          />

          <div className="stat-row">
            <div className="stat">
              <span className="stat-label">کارهای انجام‌شده</span>
              <strong>
                {fa(tasks.done)} از {fa(tasks.total)}
              </strong>
            </div>
            <div className="stat">
              <span className="stat-label">عادت‌های امروز</span>
              <strong>
                {fa(habitsProgress.done)} از {fa(habitsProgress.total)}
              </strong>
            </div>
            <div className="stat">
              <span className="stat-label">فروش امروز</span>
              <strong className="pos">{faNumber(money.sales)}</strong>
            </div>
            <div className="stat">
              <span className="stat-label">هزینهٔ امروز</span>
              <strong className="neg">{faNumber(money.expenses)}</strong>
            </div>
          </div>
        </div>

        <div className="card donut-card">
          <h2 className="card-title">پیشرفت امروز</h2>
          <Donut percent={score.percent} size={132} label="پیشرفت امروز" />
          <p className="muted center">
            تکمیل‌شده {fa(score.done)} از {fa(score.total)}
          </p>
        </div>

        <div className="card">
          <h2 className="card-title">وضعیت هفته</h2>
          <BarChart data={weekBars} max={100} />
        </div>
      </section>

      <section className="grid-two">
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">چک‌لیست امروز</h2>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                if (window.confirm('چک‌لیست امروز از روی قالب‌ها بازنویسی شود؟ تیک‌های فعلی پاک می‌شوند.')) {
                  resetDayFromTemplates(selected);
                }
              }}
            >
              بازسازی از قالب
            </button>
          </div>

          {grouped.length === 0 && (
            <p className="muted">هنوز کاری برای امروز ثبت نشده. از فرم پایین اضافه کن.</p>
          )}

          {grouped.map(({ category, items }) => (
            <div className="task-group" key={category}>
              <h3 className="group-title">
                {CATEGORY_LABELS[category]}
                <span className="group-count">
                  {fa(items.filter((t) => t.done).length)}/{fa(items.length)}
                </span>
              </h3>
              <ul className="task-list">
                {items.map((task) => (
                  <li key={task.id} className={task.done ? 'task done' : 'task'}>
                    <label>
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTask(selected, task.id)}
                      />
                      <span className="task-title">{task.title}</span>
                    </label>
                    {task.priority === 'high' && <span className="tag tag-high">مهم</span>}
                    {activeEmployees.length > 0 && (
                      <select
                        className="assignee-select"
                        value={task.assignee ?? ''}
                        onChange={(e) => assignTask(selected, task.id, e.target.value)}
                        aria-label={`سپردن «${task.title}» به کارمند`}
                        style={{
                          color: activeEmployees.find((e) => e.id === task.assignee)?.color,
                        }}
                      >
                        <option value="">— بدون مسئول</option>
                        {activeEmployees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeTask(selected, task.id)}
                      aria-label={`حذف ${task.title}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <form className="inline-form" onSubmit={submitTask}>
            <input
              className="input"
              placeholder="کار جدید…"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
            />
            <select
              className="input select"
              value={newTaskCat}
              onChange={(e) => setNewTaskCat(e.target.value as TaskCategory)}
            >
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <button type="submit" className="primary-btn">
              افزودن
            </button>
          </form>
        </div>

        <div className="stack">
          <div className="card">
            <h2 className="card-title">عادت‌های روزانه</h2>
            {dailyHabits.length === 0 && <p className="muted">عادت روزانه‌ای تعریف نشده است.</p>}
            <ul className="habit-list">
              {dailyHabits.map((habit) => {
                const done = Boolean(data.dailyLog[selected]?.[habit.id]);
                const streak = habitStreaks(data, habit.id, selected);
                return (
                  <li key={habit.id} className={done ? 'habit done' : 'habit'}>
                    <label>
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggleHabit(selected, habit)}
                      />
                      <span className="habit-emoji">{habit.emoji}</span>
                      <span className="task-title">{habit.title}</span>
                    </label>
                    {streak.current > 0 && (
                      <span className="streak" title="روزهای پیاپی">
                        🔥 {fa(streak.current)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card">
            <h2 className="card-title">ثبت سریع فروش</h2>
            <form className="inline-form" onSubmit={submitSale}>
              <input
                className="input"
                inputMode="numeric"
                placeholder={`مبلغ به ${data.settings.currency}`}
                value={saleAmount}
                onChange={(e) => setSaleAmount(e.target.value)}
              />
              <button type="submit" className="primary-btn">
                ثبت فروش
              </button>
            </form>
            <div className="money-row">
              <span>خالص امروز</span>
              <strong className={money.net >= 0 ? 'pos' : 'neg'}>
                {faNumber(money.net)} {data.settings.currency}
              </strong>
            </div>
          </div>

          {activeEmployees.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h2 className="card-title">حضور امروز</h2>
                <span className="group-count">
                  {fa(activeEmployees.filter((e) => isPresent(attendanceToday[e.id])).length)} از{' '}
                  {fa(activeEmployees.length)}
                </span>
              </div>
              <ul className="shift-list">
                {activeEmployees.map((employee) => {
                  const record = attendanceToday[employee.id];
                  return (
                    <li key={employee.id}>
                      <span className="shift-name">
                        <span className="dot" style={{ background: employee.color }} />
                        {employee.name}
                      </span>
                      <TimeInput
                        value={record?.in ?? ''}
                        onChange={(v) => setAttendance(selected, employee.id, { in: v })}
                        label={`ساعت ورود ${employee.name}`}
                      />
                      <TimeInput
                        value={record?.out ?? ''}
                        onChange={(v) => setAttendance(selected, employee.id, { out: v })}
                        label={`ساعت خروج ${employee.name}`}
                      />
                      <span className="shift-hours">
                        {attendanceIssue(record, shopHours)?.level === 'error' ? (
                          <span className="issue issue-error">⚠ ساعت‌ها را بررسی کن</span>
                        ) : (
                          formatDuration(workedMinutes(record, overnight))
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="muted">برای ثبت نهار و گزارش ماهانه به بخش کارکنان برو.</p>
            </div>
          )}

          <div className="card">
            <h2 className="card-title">یادداشت روز</h2>
            <textarea
              className="input textarea"
              rows={4}
              placeholder="اتفاق مهم امروز، درخواست مشتری، کالای ناموجود…"
              value={day.note}
              onChange={(e) => updateDay(selected, { note: e.target.value })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
