import { useMemo, useRef, useState } from 'react';
import { addDays, format, isToday, isTomorrow, isYesterday, parseISO, startOfDay, endOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarRange, Inbox, X } from 'lucide-react';
import { List, Task } from '../../types';
import { DateRange } from '../../types/calendar';
import { dayKey, dayRange, formatRangeLabel, isDateInRange, isSameRange, monthRange, toDate } from '../../utils/calendar';
import { useClickOutside } from '../../hooks/useClickOutside';
import CalendarTaskRow from './CalendarTaskRow';

interface CalendarTaskPanelProps {
  tasks: Task[];
  lists: List[];
  /** null 表示全部日期 */
  range: DateRange | null;
  /** 当前日历锚点，用于「本月」筛选 */
  anchor: Date;
  onRangeChange: (range: DateRange | null) => void;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
}

const formatGroupTitle = (date: Date) => {
  if (isToday(date)) return '今天';
  if (isTomorrow(date)) return '明天';
  if (isYesterday(date)) return '昨天';
  return format(date, 'M月d日 EEEE', { locale: zhCN });
};

export default function CalendarTaskPanel({
  tasks,
  lists,
  range,
  anchor,
  onRangeChange,
  selectedTaskId,
  onSelectTask,
}: CalendarTaskPanelProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const customRef = useRef<HTMLDivElement>(null);
  const customTriggerRef = useRef<HTMLButtonElement>(null);
  useClickOutside([customRef, customTriggerRef], () => setIsCustomOpen(false), isCustomOpen);

  const [customStart, setCustomStart] = useState(() => format(range?.start ?? new Date(), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(() =>
    format(range?.end ?? addDays(new Date(), 7), 'yyyy-MM-dd')
  );

  const getListName = (listId: string) =>
    lists.find((l) => l.id === listId)?.name ?? '未知清单';

  const todayActive = isSameRange(range, dayRange(new Date()));
  const monthActive = isSameRange(range, monthRange(anchor));
  const allActive = range === null;
  const customActive = !todayActive && !monthActive && !allActive;

  const filteredTasks = useMemo(() => {
    const inRange = range
      ? tasks.filter((task) => task.due_date !== null && isDateInRange(task.due_date, range))
      : tasks;

    return [...inRange].sort((a, b) => {
      if (a.due_date === null && b.due_date === null) return a.order - b.order;
      if (a.due_date === null) return 1;
      if (b.due_date === null) return -1;
      return a.due_date - b.due_date;
    });
  }, [tasks, range]);

  const groups = useMemo(() => {
    const map = new Map<string, { date: Date | null; tasks: Task[] }>();

    filteredTasks.forEach((task) => {
      const key = task.due_date ? dayKey(toDate(task.due_date)) : '__none__';
      const bucket = map.get(key);
      if (bucket) bucket.tasks.push(task);
      else map.set(key, { date: task.due_date ? toDate(task.due_date) : null, tasks: [task] });
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === '__none__') return 1;
        if (b === '__none__') return -1;
        return a.localeCompare(b);
      })
      .map(([key, value]) => ({ key, ...value }));
  }, [filteredTasks]);

  const applyCustomRange = () => {
    const start = startOfDay(parseISO(customStart));
    const end = endOfDay(parseISO(customEnd));
    onRangeChange(start <= end ? { start, end } : { start: end, end: start });
    setIsCustomOpen(false);
  };

  const chipClass = (active: boolean) =>
    `px-2.5 py-1 text-[12px] rounded-full transition-colors whitespace-nowrap ${
      active
        ? 'bg-[var(--dida-primary-light)] text-[var(--dida-primary)] font-medium'
        : 'text-[var(--dida-text-secondary)] hover:bg-[var(--dida-bg-hover)]'
    }`;

  return (
    <div className="w-[320px] shrink-0 border-l border-[var(--dida-border-light)] flex flex-col overflow-hidden bg-[var(--dida-surface)]">
      {/* 头部 */}
      <div className="px-3 pt-3 pb-2 border-b border-[var(--dida-border-light)] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-[var(--dida-text-main)]">任务</span>
            <span className="text-[11px] text-[var(--dida-text-tertiary)]">
              {filteredTasks.length} 个
            </span>
          </div>
          {range && (
            <button
              type="button"
              onClick={() => onRangeChange(null)}
              className="p-1 hover:bg-[var(--dida-bg-hover)] rounded transition-colors"
              title="清除日期筛选"
            >
              <X className="w-3.5 h-3.5 text-[var(--dida-text-tertiary)]" />
            </button>
          )}
        </div>

        <div className="text-[11px] text-[var(--dida-text-tertiary)] mb-2">
          {formatRangeLabel(range)}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <button type="button" className={chipClass(todayActive)} onClick={() => onRangeChange(dayRange(new Date()))}>
            本日
          </button>
          <button type="button" className={chipClass(monthActive)} onClick={() => onRangeChange(monthRange(anchor))}>
            本月
          </button>
          <button type="button" className={chipClass(allActive)} onClick={() => onRangeChange(null)}>
            全部日期
          </button>

          <div className="relative">
            <button
              ref={customTriggerRef}
              type="button"
              className={chipClass(customActive || isCustomOpen)}
              onClick={() => {
                if (!isCustomOpen) {
                  setCustomStart(format(range?.start ?? new Date(), 'yyyy-MM-dd'));
                  setCustomEnd(format(range?.end ?? addDays(new Date(), 7), 'yyyy-MM-dd'));
                }
                setIsCustomOpen((prev) => !prev);
              }}
            >
              <span className="flex items-center gap-1">
                <CalendarRange className="w-3 h-3" />
                自定义
              </span>
            </button>

            {isCustomOpen && (
              <div
                ref={customRef}
                className="absolute right-0 top-full mt-1 w-56 bg-[var(--dida-elevated)] border border-[var(--dida-border-light)] shadow-xl rounded-xl p-3 z-[300] animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="text-[11px] font-bold text-[var(--dida-text-tertiary)] mb-2">
                  自定义日期范围
                </div>
                <label className="block text-[11px] text-[var(--dida-text-tertiary)] mb-1">开始</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full mb-2 px-2 py-1 text-[12px] bg-[var(--dida-bg-input)] rounded-md outline-none text-[var(--dida-text-main)]"
                />
                <label className="block text-[11px] text-[var(--dida-text-tertiary)] mb-1">结束</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full mb-3 px-2 py-1 text-[12px] bg-[var(--dida-bg-input)] rounded-md outline-none text-[var(--dida-text-main)]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomOpen(false)}
                    className="px-2.5 py-1 text-[12px] text-[var(--dida-text-secondary)] hover:bg-[var(--dida-bg-hover)] rounded-md"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={applyCustomRange}
                    className="px-2.5 py-1 text-[12px] text-white bg-[var(--dida-primary)] rounded-md hover:opacity-90"
                  >
                    确定
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-56 px-4 text-center text-[var(--dida-text-tertiary)]">
            <Inbox className="w-8 h-8 mb-3 opacity-40" />
            <div className="text-[12px]">该时间范围内没有任务</div>
            <div className="text-[11px] mt-1 opacity-70">可以点击其他日期，或切换筛选条件</div>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.key}>
            <div className="sticky top-0 z-[1] px-3 py-1.5 bg-[var(--dida-surface)]/95 backdrop-blur text-[11px] font-bold text-[var(--dida-text-tertiary)] border-b border-[var(--dida-border-light)]">
              {group.date ? formatGroupTitle(group.date) : '无日期'}
            </div>
            {group.tasks.map((task) => (
              <CalendarTaskRow
                key={task.id}
                task={task}
                listName={getListName(task.list_id)}
                scope="panel"
                draggable
                selected={selectedTaskId === task.id}
                onSelect={onSelectTask}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="px-3 py-2 border-t border-[var(--dida-border-light)] text-[10px] text-[var(--dida-text-tertiary)] shrink-0">
        直接拖动任务到日历上，即可调整日期
      </div>
    </div>
  );
}
