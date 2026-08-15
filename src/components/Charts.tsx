import { fa, faNumber } from '../lib/jalali.js';

interface DonutProps {
  percent: number;
  size?: number;
  color?: string;
  label?: string;
  caption?: string;
}

/** دایرهٔ پیشرفت با درصد در مرکز */
export function Donut({ percent, size = 96, color = 'var(--brand)', label, caption }: DonutProps) {
  const stroke = Math.max(7, Math.round(size * 0.1));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safe = Math.max(0, Math.min(100, percent));
  const dash = (safe / 100) * circumference;

  return (
    <div className="donut" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`${label ?? 'پیشرفت'}: ${safe} درصد`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference - dash}`}
          // سرِ گرد روی مقدار صفر یک نقطهٔ اضافه می‌کشد
          strokeLinecap={safe === 0 ? 'butt' : 'round'}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray .35s ease' }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.24}
          fontWeight="700"
          fill="var(--text)"
        >
          {fa(safe)}٪
        </text>
      </svg>
      {caption && <span className="donut-caption">{caption}</span>}
    </div>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  sub?: string;
  color?: string;
  highlight?: boolean;
}

interface BarChartProps {
  data: BarDatum[];
  max?: number;
  unit?: 'percent' | 'amount';
  height?: number;
}

/** نمودار میله‌ای افقی‌چین برای وضعیت روزها */
export function BarChart({ data, max, unit = 'percent', height = 150 }: BarChartProps) {
  const peak = max ?? Math.max(1, ...data.map((d) => d.value));
  // در نمای ماهانه سی‌ویک عدد روی هم شلوغ می‌شود، پس فقط ستون‌های پُر برچسب می‌گیرند
  const dense = data.length > 14;

  return (
    <div className="barchart" style={{ height: height + 46 }}>
      <div className="barchart-plot" style={{ height }}>
        {data.map((d, i) => {
          const ratio = peak === 0 ? 0 : d.value / peak;
          return (
            <div className="bar-col" key={`${d.label}-${i}`}>
              <span className="bar-value">
                {dense && d.value === 0
                  ? ''
                  : unit === 'percent'
                    ? `${fa(Math.round(d.value))}٪`
                    : faNumber(d.value)}
              </span>
              <div
                className={`bar${d.highlight ? ' bar-highlight' : ''}`}
                style={{
                  height: `${Math.max(ratio * 100, d.value > 0 ? 4 : 1.5)}%`,
                  background: d.color ?? 'var(--brand)',
                }}
                title={`${d.label}: ${unit === 'percent' ? `${Math.round(d.value)}٪` : faNumber(d.value)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="barchart-labels">
        {data.map((d, i) => (
          <div className="bar-label" key={`${d.label}-label-${i}`}>
            <span>{d.label}</span>
            {d.sub && <small>{d.sub}</small>}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProgressBarProps {
  percent: number;
  color?: string;
  height?: number;
}

export function ProgressBar({ percent, color = 'var(--brand)', height = 10 }: ProgressBarProps) {
  const safe = Math.max(0, Math.min(100, percent));
  return (
    <div className="progressbar" style={{ height }}>
      <div className="progressbar-fill" style={{ width: `${safe}%`, background: color }} />
    </div>
  );
}
