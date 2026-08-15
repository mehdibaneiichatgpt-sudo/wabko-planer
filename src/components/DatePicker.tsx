import { useMemo, useState } from 'react';
import {
  MONTHS,
  WEEKDAYS_SHORT,
  addKeyDays,
  dateKey,
  fa,
  formatWithWeekday,
  jalaaliMonthLength,
  parseKey,
  weekdayIndex,
} from '../lib/jalali.js';

interface DatePickerProps {
  value: string;
  today: string;
  onChange: (key: string) => void;
}

/** نوار تاریخ شمسی با تقویم بازشو */
export function DatePicker({ value, today, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseKey(value);
  const [view, setView] = useState({ jy: selected.jy, jm: selected.jm });

  const grid = useMemo(() => {
    const first = { jy: view.jy, jm: view.jm, jd: 1 };
    const lead = weekdayIndex(first);
    const length = jalaaliMonthLength(view.jy, view.jm);
    const cells: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= length; d += 1) {
      cells.push(dateKey({ jy: view.jy, jm: view.jm, jd: d }));
    }
    return cells;
  }, [view]);

  const shiftMonth = (delta: number) => {
    setView((prev) => {
      let jm = prev.jm + delta;
      let jy = prev.jy;
      if (jm < 1) {
        jm = 12;
        jy -= 1;
      } else if (jm > 12) {
        jm = 1;
        jy += 1;
      }
      return { jy, jm };
    });
  };

  const openPicker = () => {
    setView({ jy: selected.jy, jm: selected.jm });
    setOpen((prev) => !prev);
  };

  return (
    <div className="datepicker">
      <div className="datepicker-bar">
        <button
          type="button"
          className="icon-btn"
          onClick={() => onChange(addKeyDays(value, -1))}
          aria-label="روز قبل"
        >
          ‹
        </button>

        <button type="button" className="date-display" onClick={openPicker}>
          <span className="date-display-main">{formatWithWeekday(value)}</span>
          <span className="date-display-year">{fa(selected.jy)}</span>
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={() => onChange(addKeyDays(value, 1))}
          aria-label="روز بعد"
        >
          ›
        </button>

        {value !== today && (
          <button type="button" className="ghost-btn" onClick={() => onChange(today)}>
            برو به امروز
          </button>
        )}
      </div>

      {open && (
        <div className="calendar card">
          <div className="calendar-head">
            <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="ماه قبل">
              ‹
            </button>
            <strong>
              {MONTHS[view.jm - 1]} {fa(view.jy)}
            </strong>
            <button type="button" className="icon-btn" onClick={() => shiftMonth(1)} aria-label="ماه بعد">
              ›
            </button>
          </div>

          <div className="calendar-grid">
            {WEEKDAYS_SHORT.map((w) => (
              <span key={w} className="calendar-weekday">
                {w}
              </span>
            ))}
            {grid.map((key, i) =>
              key === null ? (
                <span key={`blank-${i}`} />
              ) : (
                <button
                  type="button"
                  key={key}
                  className={[
                    'calendar-day',
                    key === value ? 'is-selected' : '',
                    key === today ? 'is-today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                >
                  {fa(parseKey(key).jd)}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
