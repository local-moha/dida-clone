import { useState } from 'react';
import { endOfMonth, format, isSameDay, isSameMonth, isToday, startOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface QuickDatePickerProps {
  value: Date;
  onSelect: (date: Date) => void;
}

/** 快速选择年 / 月 / 日的紧凑面板 */
export default function QuickDatePicker({ value, onSelect }: QuickDatePickerProps) {
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  const monthStart = startOfMonth(new Date(viewYear, viewMonth, 1));
  const daysInMonth = endOfMonth(monthStart).getDate();
  // 周一为一周第一天
  const leading = (monthStart.getDay() + 6) % 7;

  const yearOptions = Array.from({ length: 13 }, (_, i) => viewYear - 6 + i);

  return (
    <div className="absolute left-0 top-full mt-1 w-[280px] bg-[var(--dida-elevated)] border border-[var(--dida-border-light)] shadow-xl rounded-xl p-3 z-[400] animate-in fade-in zoom-in-95 duration-100">
      {/* 年份快速切换 */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setViewYear((y) => y - 1)}
          className="p-1 rounded-md hover:bg-[var(--dida-bg-hover)] text-[var(--dida-text-secondary)]"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <select
          value={viewYear}
          onChange={(e) => setViewYear(Number(e.target.value))}
          className="flex-1 text-center bg-transparent text-[13px] font-bold text-[var(--dida-text-main)] outline-none cursor-pointer"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year} 年
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setViewYear((y) => y + 1)}
          className="p-1 rounded-md hover:bg-[var(--dida-bg-hover)] text-[var(--dida-text-secondary)]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 月份选择 */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        {Array.from({ length: 12 }, (_, month) => {
          const active = month === viewMonth;
          return (
            <button
              key={month}
              type="button"
              onClick={() => setViewMonth(month)}
              className={`py-1 text-[12px] rounded-md transition-colors ${
                active
                  ? 'bg-[var(--dida-primary)] text-white font-medium'
                  : 'text-[var(--dida-text-main)] hover:bg-[var(--dida-bg-hover)]'
              }`}
            >
              {month + 1}月
            </button>
          );
        })}
      </div>

      <div className="h-[1px] bg-[var(--dida-border-light)] my-2" />

      {/* 日期选择 */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['一', '二', '三', '四', '五', '六', '日'].map((label) => (
          <div key={label} className="text-center text-[10px] text-[var(--dida-text-tertiary)]">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: leading }, (_, i) => (
          <div key={`lead-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = new Date(viewYear, viewMonth, i + 1);
          const active = isSameDay(date, value);
          const today = isToday(date);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(date)}
              className={`h-7 text-[12px] rounded-md transition-colors ${
                active
                  ? 'bg-[var(--dida-primary)] text-white font-bold'
                  : today
                    ? 'text-[var(--dida-primary)] font-bold hover:bg-[var(--dida-bg-hover)]'
                    : 'text-[var(--dida-text-main)] hover:bg-[var(--dida-bg-hover)]'
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--dida-text-tertiary)]">
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            setViewYear(now.getFullYear());
            setViewMonth(now.getMonth());
            onSelect(now);
          }}
          className="px-2 py-1 rounded-md hover:bg-[var(--dida-bg-hover)] text-[var(--dida-primary)]"
        >
          回到今天
        </button>
        <span>
          {format(monthStart, 'yyyy年M月', { locale: zhCN })}
          {isSameMonth(monthStart, value) ? ' · 当前' : ''}
        </span>
      </div>
    </div>
  );
}
