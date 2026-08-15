import { useState } from 'react';
import { fa } from '../lib/jalali.js';
import { formatTime, parseTime, toLatinDigits } from '../lib/time.js';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

/**
 * فیلد ساعت ۲۴ساعته با ارقام فارسی.
 * از input[type=time] استفاده نمی‌کنیم چون قالب نمایشش را از زبان مرورگر
 * می‌گیرد و روی خیلی از دستگاه‌ها AM/PM انگلیسی نشان می‌دهد.
 * مقدار ذخیره‌شده همیشه «HH:MM» است.
 */
export function TimeInput({ value, onChange, label, className = '' }: TimeInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  /** «۹۳۰» یا «0930» را به «۰۹:۳۰» تبدیل می‌کند */
  const shape = (raw: string): string => {
    const digits = toLatinDigits(raw).replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  };

  const commit = () => {
    if (draft === null) return;
    const minutes = parseTime(draft);
    onChange(minutes === null ? '' : formatTime(minutes));
    setDraft(null);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      maxLength={5}
      placeholder="--:--"
      className={`input input-time ${className}`.trim()}
      aria-label={label}
      value={draft !== null ? fa(draft) : value ? fa(value) : ''}
      onChange={(e) => setDraft(shape(e.target.value))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}
