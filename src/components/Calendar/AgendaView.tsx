import { useMemo } from 'react';
import { addDays, format, isToday, isTomorrow, startOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarClock } from 'lucide-react';
import { Task } from '../../types';
import { AGENDA_DAY_COUNT } from '../../constants/calendar';
import { dayKey } from '../../utils/calendar';
import CalendarTaskRow from './CalendarTaskRow';

interface AgendaViewProps {
  anchor: Date;
  tasksByDay: Map<string, Task[]>;
  getListName: (listId: string) => string;
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
  onSelectDay: (date: Date) => void;
}

/** 日程视图：按天纵向排列未来的任务 */
export default function AgendaView({
  anchor,
  tasksByDay,
  getListName,
  onSelectTask,
  selectedTaskId,
  onSelectDay,
}: AgendaViewProps) {
  const days = useMemo(() => {
    const start = startOfDay(anchor);
    return Array.from({ length: AGENDA_DAY_COUNT }, (_, i) => addDays(start, i));
  }, [anchor]);

  const daysWithTasks = days.filter((date) => (tasksByDay.get(dayKey(date)) ?? []).length > 0);

  const formatDayTitle = (date: Date) => {
    if (isToday(date)) return '今天';
    if (isTomorrow(date)) return '明天';
    return format(date, 'M月d日 EEEE', { locale: zhCN });
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 pb-6">
      {daysWithTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-[var(--dida-text-tertiary)]">
          <CalendarClock className="w-10 h-10 mb-4 opacity-40" />
          <div className="text-[13px]">接下来 {AGENDA_DAY_COUNT} 天没有安排</div>
        </div>
      )}

      {daysWithTasks.map((date) => {
        const tasks = tasksByDay.get(dayKey(date)) ?? [];
        return (
          <div key={date.toISOString()} className="mb-4">
            <button
              type="button"
              onClick={() => onSelectDay(date)}
              className="w-full flex items-center gap-2 px-1 py-1.5 text-left hover:bg-[var(--dida-bg-hover)] rounded-md transition-colors"
            >
              <span className="text-[13px] font-bold text-[var(--dida-text-main)]">
                {formatDayTitle(date)}
              </span>
              <span className="text-[11px] text-[var(--dida-text-tertiary)]">{tasks.length} 个任务</span>
            </button>

            <div className="border border-[var(--dida-border-light)] rounded-lg overflow-hidden bg-[var(--dida-surface)]">
              {tasks.map((task) => (
                <CalendarTaskRow
                  key={task.id}
                  task={task}
                  listName={getListName(task.list_id)}
                  scope={`agenda-${dayKey(date)}`}
                  selected={selectedTaskId === task.id}
                  onSelect={onSelectTask}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
