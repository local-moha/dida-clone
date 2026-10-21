import { isSameMonth } from 'date-fns';
import { Task } from '../../types';
import { WEEK_LABELS } from '../../constants/calendar';
import { dayKey, getMonthGridDays } from '../../utils/calendar';
import DayCell from './DayCell';

interface MonthViewProps {
  anchor: Date;
  selectedDate: Date;
  tasksByDay: Map<string, Task[]>;
  maxVisible: number;
  onSelectDay: (date: Date) => void;
}

export default function MonthView({
  anchor,
  selectedDate,
  tasksByDay,
  maxVisible,
  onSelectDay,
}: MonthViewProps) {
  const days = getMonthGridDays(anchor);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 pb-4">
      <div className="grid grid-cols-7 border-t border-l border-[var(--dida-border-light)] rounded-lg overflow-hidden">
        {WEEK_LABELS.map((label) => (
          <div
            key={label}
            className="py-1.5 text-center text-[12px] font-medium text-[var(--dida-text-tertiary)] bg-[var(--dida-bg-hover)] border-b border-r border-[var(--dida-border-light)]"
          >
            {label}
          </div>
        ))}

        {days.map((date) => (
          <DayCell
            key={date.toISOString()}
            date={date}
            tasks={tasksByDay.get(dayKey(date)) ?? []}
            isCurrentMonth={isSameMonth(date, anchor)}
            isSelected={dayKey(date) === dayKey(selectedDate)}
            maxVisible={maxVisible}
            onSelect={onSelectDay}
          />
        ))}
      </div>
    </div>
  );
}
