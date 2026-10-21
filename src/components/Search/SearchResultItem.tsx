import { Bell, CalendarDays, Hash, ListTodo, RefreshCw } from 'lucide-react';
import { Task } from '../../types';
import { useToggleTask } from '../../hooks/useTasks';
import { useAppStore } from '../../store/useAppStore';
import { getPriorityBgColor, getPriorityClass, getPriorityColor } from '../../utils/priority';
import { formatTaskDate, isOverdue } from '../../utils/date';
import { splitHighlight } from '../../utils/search';

interface SearchResultItemProps {
  task: Task;
  keyword: string;
  listName: string;
  tags: { id: string; name: string; color: string }[];
}

export default function SearchResultItem({
  task,
  keyword,
  listName,
  tags,
}: SearchResultItemProps) {
  const toggleTask = useToggleTask();
  const selectedTaskId = useAppStore((s) => s.selectedTaskId);
  const setSelectedTaskId = useAppStore((s) => s.setSelectedTaskId);
  const isSelected = selectedTaskId === task.id;

  const overdue = !task.completed && isOverdue(task.due_date);

  return (
    <div
      onClick={() => setSelectedTaskId(task.id)}
      className={`group flex items-start gap-2 px-4 py-2.5 cursor-pointer transition-colors border-b border-[var(--dida-border-light)] ${
        isSelected ? 'bg-[var(--dida-primary-light)]' : 'hover:bg-[var(--dida-bg-hover)]'
      }`}
    >
      <div className="flex-shrink-0 flex items-center justify-center w-6 pt-0.5">
        <div
          onClick={(e) => {
            e.stopPropagation();
            toggleTask.mutate(task.id);
          }}
          className={`dida-checkbox ${getPriorityClass(task.priority)} ${task.completed ? 'completed' : ''}`}
          style={{
            borderColor: !task.completed ? getPriorityColor(task.priority) : undefined,
            backgroundColor: getPriorityBgColor(task.priority, !!task.completed),
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div
          className={`text-[14px] leading-snug break-words ${
            task.completed ? 'text-[var(--dida-text-tertiary)] line-through' : 'text-[var(--dida-text-main)]'
          }`}
        >
          {splitHighlight(task.title, keyword).map((segment, index) =>
            segment.matched ? (
              <mark key={index} className="bg-yellow-200/70 text-inherit rounded-[2px] px-0.5">
                {segment.text}
              </mark>
            ) : (
              <span key={index}>{segment.text}</span>
            )
          )}
        </div>

        {task.description && (
          <div className="mt-0.5 text-[12px] text-[var(--dida-text-tertiary)] line-clamp-1 break-words">
            {task.description}
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--dida-text-secondary)]">
          <span className="flex items-center gap-1">
            <ListTodo className="w-3 h-3" />
            {listName}
          </span>

          {task.due_date && (
            <span className={`flex items-center gap-1 ${overdue ? 'text-[var(--priority-high)]' : ''}`}>
              <CalendarDays className="w-3 h-3" />
              {formatTaskDate(task.due_date)}
            </span>
          )}

          {task.repeat_rule && (
            <span className="flex items-center gap-1 text-[var(--dida-text-tertiary)]">
              <RefreshCw className="w-3 h-3" />
              重复
            </span>
          )}

          {task.reminder && task.reminder !== 'none' && (
            <span className="flex items-center gap-1 text-[var(--dida-text-tertiary)]">
              <Bell className="w-3 h-3" />
              提醒
            </span>
          )}

          {tags.map((tag) => (
            <span key={tag.id} className="flex items-center gap-0.5" style={{ color: tag.color }}>
              <Hash className="w-3 h-3" />
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
