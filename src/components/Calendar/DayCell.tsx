import { useDroppable } from '@dnd-kit/core';
import { format, isToday } from 'date-fns';
import { Task } from '../../types';
import { dayKey } from '../../utils/calendar';
import { getPriorityColor } from '../../utils/priority';

interface DayCellProps {
  date: Date;
  tasks: Task[];
  isCurrentMonth?: boolean;
  isSelected: boolean;
  /** 单元格内最多展示的任务条数 */
  maxVisible?: number;
  onSelect: (date: Date) => void;
}

export default function DayCell({
  date,
  tasks,
  isCurrentMonth = true,
  isSelected,
  maxVisible = 4,
  onSelect,
}: DayCellProps) {
  const today = isToday(date);
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayKey(date)}`,
    data: { date },
  });

  const visible = tasks.slice(0, maxVisible);
  const rest = tasks.length - visible.length;

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(date)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(date);
        }
      }}
      className={`min-h-[96px] p-1.5 flex flex-col gap-1 border-b border-r border-[var(--dida-border-light)] text-left transition-colors outline-none ${
        isCurrentMonth ? 'bg-[var(--dida-surface)]' : 'bg-[var(--dida-bg-hover)]/40'
      } ${isSelected ? 'ring-1 ring-inset ring-[var(--dida-primary)]' : 'hover:bg-[var(--dida-bg-hover)]'} ${
        isOver ? 'bg-[var(--dida-primary-light)] ring-1 ring-inset ring-[var(--dida-primary)]' : ''
      }`}
    >
      <div className="flex items-center justify-between px-0.5">
        <span
          className={`text-[12px] w-6 h-6 flex items-center justify-center rounded-full ${
            today
              ? 'bg-[var(--dida-primary)] text-white font-bold'
              : isCurrentMonth
                ? 'text-[var(--dida-text-main)]'
                : 'text-[var(--dida-text-tertiary)]'
          }`}
        >
          {format(date, 'd')}
        </span>
        {tasks.length > 0 && (
          <span className="text-[10px] text-[var(--dida-text-tertiary)]">{tasks.length}</span>
        )}
      </div>

      {maxVisible === 0 ? (
        <div className="flex flex-wrap gap-1 pt-0.5 px-0.5">
          {tasks.slice(0, 8).map((task) => (
            <span
              key={task.id}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: task.completed
                  ? 'var(--priority-none)'
                  : getPriorityColor(task.priority),
              }}
            />
          ))}
        </div>
      ) : (
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {visible.map((task) => (
          <div key={task.id} className="flex items-center gap-1 min-w-0">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor: task.completed
                  ? 'var(--priority-none)'
                  : getPriorityColor(task.priority),
              }}
            />
            <span
              className={`text-[11px] truncate ${
                task.completed
                  ? 'text-[var(--dida-text-tertiary)] line-through'
                  : 'text-[var(--dida-text-secondary)]'
              }`}
            >
              {task.title || '无标题任务'}
            </span>
          </div>
        ))}
        {rest > 0 && (
          <span className="text-[10px] text-[var(--dida-text-tertiary)] pl-2.5">+{rest}</span>
        )}
      </div>
      )}
    </div>
  );
}
