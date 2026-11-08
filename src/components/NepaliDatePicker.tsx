import React, { useMemo } from 'react';
import {
  NEPALI_YEARS,
  NEPALI_MONTHS,
  toNepaliDigits,
  fromNepaliDigits,
} from '../data/nvcStructure';

export const EXTENDED_NEPALI_YEARS = NEPALI_YEARS;

interface NepaliDatePickerProps {
  value?: string | null;
  onChange: (dateStr: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  format?: 'nepali' | 'english'; // Default is 'nepali' (e.g. '२०८३-०७-२२')
  placeholderYear?: string;
  placeholderMonth?: string;
  placeholderDay?: string;
  ariaLabel?: string;
}

export const NepaliDatePicker: React.FC<NepaliDatePickerProps> = ({
  value = '',
  onChange,
  required = false,
  disabled = false,
  className = 'px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:border-blue-800 text-xs',
  format = 'nepali',
  placeholderYear = 'साल',
  placeholderMonth = 'महिना',
  placeholderDay = 'गते',
  ariaLabel = 'नेपाली मिति',
}) => {
  // Parse year, month, day from value
  const parsed = useMemo(() => {
    if (!value) return { year: '', month: '', day: '' };
    const ascii = fromNepaliDigits(String(value).trim());
    const parts = ascii.split(/[-/]/);
    if (parts.length >= 3) {
      const y = parts[0].padStart(4, '0');
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      return {
        year: toNepaliDigits(y),
        month: !isNaN(m) && m >= 1 && m <= 12 ? String(m) : '',
        day: !isNaN(d) && d >= 1 && d <= 32 ? String(d) : '',
      };
    }
    return { year: '', month: '', day: '' };
  }, [value]);

  const handleYearChange = (newYear: string) => {
    emitDate(newYear, parsed.month, parsed.day);
  };

  const handleMonthChange = (newMonth: string) => {
    emitDate(parsed.year, newMonth, parsed.day);
  };

  const handleDayChange = (newDay: string) => {
    emitDate(parsed.year, parsed.month, newDay);
  };

  const emitDate = (yr: string, mo: string, dy: string) => {
    if (!yr && !mo && !dy) {
      onChange('');
      return;
    }
    const safeYear = yr || '२०८३';
    const safeMonth = mo ? String(mo).padStart(2, '0') : '०७';
    const safeDay = dy ? String(dy).padStart(2, '0') : '२२';

    if (format === 'english') {
      const engYear = fromNepaliDigits(safeYear);
      const engMonth = fromNepaliDigits(safeMonth).padStart(2, '0');
      const engDay = fromNepaliDigits(safeDay).padStart(2, '0');
      onChange(`${engYear}-${engMonth}-${engDay}`);
    } else {
      const nepYear = toNepaliDigits(safeYear);
      const nepMonth = toNepaliDigits(safeMonth);
      const nepDay = toNepaliDigits(safeDay);
      onChange(`${nepYear}-${nepMonth}-${nepDay}`);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-1.5 w-full">
      {/* १. साल ड्रपडाउन */}
      <select
        value={parsed.year}
        disabled={disabled}
        required={required}
        aria-label={`${ariaLabel} साल`}
        onChange={(e) => handleYearChange(e.target.value)}
        className={`${className} cursor-pointer`}
      >
        <option value="">{placeholderYear}</option>
        {EXTENDED_NEPALI_YEARS.map((yr) => (
          <option key={yr} value={yr}>
            {yr}
          </option>
        ))}
      </select>

      {/* २. महिना ड्रपडाउन */}
      <select
        value={parsed.month}
        disabled={disabled}
        required={required}
        aria-label={`${ariaLabel} महिना`}
        onChange={(e) => handleMonthChange(e.target.value)}
        className={`${className} cursor-pointer`}
      >
        <option value="">{placeholderMonth}</option>
        {NEPALI_MONTHS.map((m, idx) => (
          <option key={m} value={idx + 1}>
            {m}
          </option>
        ))}
      </select>

      {/* ३. गते ड्रपडाउन */}
      <select
        value={parsed.day}
        disabled={disabled}
        required={required}
        aria-label={`${ariaLabel} गते`}
        onChange={(e) => handleDayChange(e.target.value)}
        className={`${className} cursor-pointer`}
      >
        <option value="">{placeholderDay}</option>
        {Array.from({ length: 32 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {toNepaliDigits(d)}
          </option>
        ))}
      </select>
    </div>
  );
};
