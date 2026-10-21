import { useDroppable } from '@dnd-kit/core';
import { format, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Task } from '../../types';
import { dayKey } from '../../utils/calendar';
import CalendarTaskRow from './CalendarTaskRow';

interface DayColumnProps {
  date: Date;
  tasks: Task[];
  selectedDate: Date;
  getListName: (listId: string) => string;
  onSelectDay: (date: Date) => void;
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
  /** 日视图只有一列，可以展示更多信息 */
  spacious?: boolean;
}

function DayColumn({
  date,
  tasks,
  selectedDate,
  getListName,
  onSelectDay,
  onSelectTask,
  selectedTaskId,
  spacious,
}: DayColumnProps) {
  const today = isToday(date);
  const isSelected = dayKey(date) === dayKey(selectedDate);
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayKey(date)}`,
    data: { date },
  });

  return (
    <div
      className={`flex flex-col min-w-0 border-r border-[var(--dida-border-light)] last:border-r-0 ${
        isOver ? 'bg-[var(--dida-primary-light)]' : ''
      }`}
    >
      <button
        type="button"
        onClick={() => onSelectDay(date)}
        className={`shrink-0 px-2 py-2 border-b border-[var(--dida-border-light)] text-center transition-colors ${
          isSelected ? 'bg-[var(--dida-primary-light)]' : 'hover:bg-[var(--dida-bg-hover)]'
        }`}
      >
        <div className="text-[11px] text-[var(--dida-text-tertiary)]">
          {format(date, 'EEE', { locale: zhCN })}
        </div>
        <div
          className={`mt-0.5 inline-flex items-center justify-center min-w-6 h-6 px-1 rounded-full text-[13px] ${
            today ? 'bg-[var(--dida-primary)] text-white font-bold' : 'text-[var(--dida-text-main)]'
          }`}
        >
          {spacious ? format(date, 'M月d日', { locale: zhCN }) : format(date, 'd')}
        </div>
      </button>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto custom-scrollbar min-h-[120px]">
        {tasks.length === 0 && (
          <div className="h-full flex items-center justify-center py-6 text-[11px] text-[var(--dida-text-tertiary)]">
            无任务
          </div>
        )}

        {tasks.map((task) => (
          <CalendarTaskRow
            key={task.id}
            task={task}
            listName={getListName(task.list_id)}
            scope={`column-${dayKey(date)}`}
            selected={selectedTaskId === task.id}
            onSelect={onSelectTask}
          />
        ))}
      </div>
    </div>
  );
}

interface DayColumnsViewProps {
  days: Date[];
  selectedDate: Date;
  tasksByDay: Map<string, Task[]>;
  getListName: (listId: string) => string;
  onSelectDay: (date: Date) => void;
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
  spacious?: boolean;
}

/** 周视图 / 日视图 / 多日视图共用：按天分列 */
export default function DayColumnsView({
  days,
  selectedDate,
  tasksByDay,
  getListName,
  onSelectDay,
  onSelectTask,
  selectedTaskId,
  spacious,
}: DayColumnsViewProps) {
  return (
    <div className="flex-1 min-h-0 overflow-hidden px-4 pb-4">
      <div className="flex h-full border border-[var(--dida-border-light)] rounded-lg overflow-hidden bg-[var(--dida-surface)]">
        {days.map((date) => (
          <div key={date.toISOString()} className="flex-1 min-w-0 flex flex-col">
            <DayColumn
              date={date}
              tasks={tasksByDay.get(dayKey(date)) ?? []}
              selectedDate={selectedDate}
              getListName={getListName}
              onSelectDay={onSelectDay}
              onSelectTask={onSelectTask}
              selectedTaskId={selectedTaskId}
              spacious={spacious}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
