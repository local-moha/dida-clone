import { useDraggable } from '@dnd-kit/core';
import { Task } from '../../types';
import { useToggleTask } from '../../hooks/useTasks';
import { getPriorityBgColor, getPriorityColor } from '../../utils/priority';
import { formatTaskTime, isOverdue } from '../../utils/date';

interface CalendarTaskRowProps {
  task: Task;
  listName: string;
  selected?: boolean;
  /** 是否可以作为拖拽源（拖到日历上修改日期） */
  draggable?: boolean;
  /** 同一任务可能在多个列表中出现，用 scope 区分拖拽 id */
  scope: string;
  onSelect: (taskId: string) => void;
  showCheckbox?: boolean;
}

export default function CalendarTaskRow({
  task,
  listName,
  selected,
  draggable = false,
  scope,
  onSelect,
  showCheckbox = true,
}: CalendarTaskRowProps) {
  const toggleTask = useToggleTask();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${scope}-${task.id}`,
    data: { task },
    disabled: !draggable,
  });

  const overdue = !task.completed && isOverdue(task.due_date);
  const timeText = formatTaskTime(task.due_date);

  return (
    <div
      ref={setNodeRef}
      // 整行都可以拖动（点击不移动时仍按"选中"处理）
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      onClick={() => onSelect(task.id)}
      className={`group relative flex items-start gap-2 px-3 py-2 border-b border-[var(--dida-border-light)] transition-colors ${
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${selected ? 'bg-[var(--dida-primary-light)]' : 'hover:bg-[var(--dida-bg-hover)]'} ${
        isDragging ? 'opacity-40' : ''
      }`}
      title={draggable ? '拖动到日历上调整日期' : undefined}
    >
      {showCheckbox && (
        <div className="flex-shrink-0 flex items-center justify-center w-5 pt-0.5">
          <div
            onClick={(e) => {
              e.stopPropagation();
              toggleTask.mutate(task.id);
            }}
            className={`dida-checkbox ${task.completed ? 'completed' : ''}`}
            style={{
              borderColor: !task.completed ? getPriorityColor(task.priority) : undefined,
              backgroundColor: getPriorityBgColor(task.priority, !!task.completed),
              width: '15px',
              height: '15px',
            }}
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div
          className={`text-[13px] leading-snug break-words ${
            task.completed
              ? 'text-[var(--dida-text-tertiary)] line-through'
              : 'text-[var(--dida-text-main)]'
          }`}
        >
          {task.title || '无标题任务'}
        </div>

        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--dida-text-tertiary)]">
          {timeText && (
            <span className={overdue ? 'text-[var(--priority-high)]' : ''}>{timeText}</span>
          )}
          <span className="truncate">{listName}</span>
        </div>
      </div>
    </div>
  );
}
