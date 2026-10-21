import { format } from 'date-fns';
import { Task } from '../../types';
import { WEEK_LABELS } from '../../constants/calendar';
import { dayKey, getMultiWeeks } from '../../utils/calendar';
import DayCell from './DayCell';

interface MultiWeekViewProps {
  anchor: Date;
  selectedDate: Date;
  tasksByDay: Map<string, Task[]>;
  maxVisible: number;
  onSelectDay: (date: Date) => void;
}

/** 多周视图：连续 N 周，每周一行 */
export default function MultiWeekView({
  anchor,
  selectedDate,
  tasksByDay,
  maxVisible,
  onSelectDay,
}: MultiWeekViewProps) {
  const weeks = getMultiWeeks(anchor);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 pb-4 space-y-3">
      <div className="grid grid-cols-7 sticky top-0 z-10 bg-[var(--dida-surface)]">
        {WEEK_LABELS.map((label) => (
          <div
            key={label}
            className="py-1.5 text-center text-[12px] font-medium text-[var(--dida-text-tertiary)]"
          >
            {label}
          </div>
        ))}
      </div>

      {weeks.map((week) => (
        <div key={week[0].toISOString()} className="relative">
          <div className="absolute -left-1 top-0 bottom-0 flex items-center">
            <span className="text-[10px] text-[var(--dida-text-tertiary)] rotate-180 [writing-mode:vertical-rl]">
              {format(week[0], 'M/d')} 周
            </span>
          </div>
          <div className="ml-4 grid grid-cols-7 border-t border-l border-[var(--dida-border-light)] rounded-lg overflow-hidden">
            {week.map((date) => (
              <DayCell
                key={date.toISOString()}
                date={date}
                tasks={tasksByDay.get(dayKey(date)) ?? []}
                isCurrentMonth
                isSelected={dayKey(date) === dayKey(selectedDate)}
                maxVisible={maxVisible}
                onSelect={onSelectDay}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
