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

interface AreaChartProps {
  data: number[];
  height?: number;
  color?: string;
}

/** روند پیشرفت روزانه به شکل منحنی نرم */
export function AreaChart({ data, height = 120, color = 'var(--brand)' }: AreaChartProps) {
  if (data.length < 2) return <div className="areachart-empty muted">داده‌ای برای نمایش نیست.</div>;

  const width = 600;
  const pad = 6;
  const stepX = (width - pad * 2) / (data.length - 1);
  const points = data.map((value, i) => ({
    x: pad + i * stepX,
    y: pad + (1 - Math.max(0, Math.min(100, value)) / 100) * (height - pad * 2),
  }));

  // نرم‌کردن منحنی با نقاط کنترلی افقی بین هر دو نقطهٔ متوالی
  let line = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    line += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  const area = `${line} L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z`;

  return (
    <svg
      className="areachart"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ height }}
      role="img"
      aria-label="روند پیشرفت روزانه"
    >
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#area-fill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface RankDatum {
  label: string;
  emoji?: string;
  value: number;
  color: string;
}

/** نمودار میله‌ای افقی برای رتبه‌بندی عادت‌ها */
export function RankChart({ data }: { data: RankDatum[] }) {
  if (data.length === 0) return <p className="muted">هنوز داده‌ای ثبت نشده است.</p>;
  const peak = Math.max(1, ...data.map((d) => d.value));

  return (
    <ul className="rank-chart">
      {data.map((d) => (
        <li key={d.label}>
          <span className="rank-label">
            {d.emoji && <span className="habit-emoji">{d.emoji}</span>}
            {d.label}
          </span>
          <span className="rank-track">
            <span
              className="rank-fill"
              style={{ width: `${Math.max((d.value / peak) * 100, d.value > 0 ? 6 : 0)}%`, background: d.color }}
            >
              {d.value > 0 && <em>{fa(d.value)}</em>}
            </span>
          </span>
        </li>
      ))}
    </ul>
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
