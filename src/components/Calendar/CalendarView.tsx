import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '../../types';
import { DateRange } from '../../types/calendar';
import { useTasks, useUpdateTask } from '../../hooks/useTasks';
import { useLists } from '../../hooks/useLists';
import { useAppStore } from '../../store/useAppStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useElementWidth } from '../../hooks/useElementWidth';
import { CALENDAR_VIEW_OPTIONS, MULTI_DAY_COUNT } from '../../constants/calendar';
import {
  applyDateToTask,
  dayKey,
  dayRange,
  getMultiDays,
  getViewTitle,
  getVisibleRange,
  getWeekDays,
  monthRange,
  shiftAnchor,
  toDate,
} from '../../utils/calendar';
import MonthView from './MonthView';
import DayColumnsView from './DayColumnsView';
import MultiWeekView from './MultiWeekView';
import AgendaView from './AgendaView';
import CalendarTaskPanel from './CalendarTaskPanel';
import QuickDatePicker from './QuickDatePicker';

interface CalendarViewProps {
  /** 宽度足够时显示右侧任务列表 */
  showTaskPanel?: boolean;
}

export default function CalendarView({ showTaskPanel = true }: CalendarViewProps) {
  const view = useCalendarStore((s) => s.view);
  const setView = useCalendarStore((s) => s.setView);
  const selectedTaskId = useAppStore((s) => s.selectedTaskId);
  const setSelectedTaskId = useAppStore((s) => s.setSelectedTaskId);
  const showToast = useAppStore((s) => s.showToast);

  const { data: tasks } = useTasks();
  const { data: lists } = useLists();
  const updateTask = useUpdateTask();

  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [range, setRange] = useState<DateRange | null>(() => monthRange(new Date()));
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isQuickPickerOpen, setIsQuickPickerOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const viewMenuRef = useRef<HTMLDivElement>(null);
  const viewTriggerRef = useRef<HTMLButtonElement>(null);
  const quickPickerRef = useRef<HTMLDivElement>(null);
  const quickTriggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  useClickOutside([viewMenuRef, viewTriggerRef], () => setIsViewMenuOpen(false), isViewMenuOpen);
  useClickOutside(
    [quickPickerRef, quickTriggerRef],
    () => setIsQuickPickerOpen(false),
    isQuickPickerOpen
  );

  // 日历区域宽度：过窄时单元格只显示圆点
  const calendarWidth = useElementWidth(calendarRef);
  const compact = calendarWidth > 0 && calendarWidth < 620;

  // 切换视图或翻页时，同步任务列的日期筛选
  useEffect(() => {
    setRange(getVisibleRange(view, anchorDate));
  }, [view, anchorDate]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    (tasks ?? []).forEach((task) => {
      if (!task.due_date) return;
      const key = dayKey(toDate(task.due_date));
      const bucket = map.get(key);
      if (bucket) bucket.push(task);
      else map.set(key, [task]);
    });
    // 每天内部按时间、优先级排序
    map.forEach((list) =>
      list.sort((a, b) => {
        const diff = (a.due_date ?? 0) - (b.due_date ?? 0);
        return diff !== 0 ? diff : b.priority - a.priority;
      })
    );
    return map;
  }, [tasks]);

  const getListName = (listId: string) =>
    (lists ?? []).find((l) => l.id === listId)?.name ?? '收集箱';

  const handleSelectDay = (date: Date) => {
    setSelectedDate(date);
    setRange(dayRange(date));
  };

  const handleNavigate = (direction: 1 | -1) => {
    setAnchorDate((prev) => shiftAnchor(view, prev, direction));
  };

  const handleToday = () => {
    const now = new Date();
    setAnchorDate(now);
    setSelectedDate(now);
  };

  const handleQuickSelect = (date: Date) => {
    setAnchorDate(date);
    setSelectedDate(date);
    setIsQuickPickerOpen(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask((event.active.data.current?.task as Task) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    const targetDate = event.over?.data.current?.date as Date | undefined;
    setActiveTask(null);

    if (!task || !targetDate) return;
    if (task.due_date && dayKey(toDate(task.due_date)) === dayKey(targetDate)) return;

    updateTask.mutate({
      ...task,
      due_date: applyDateToTask(task.due_date, targetDate),
    });
    showToast(`已调整到 ${format(targetDate, 'M月d日', { locale: zhCN })}`);
  };

  const maxVisible = compact ? 0 : showTaskPanel ? 4 : 6;

  const renderCalendar = () => {
    switch (view) {
      case 'week':
        return (
          <DayColumnsView
            days={getWeekDays(anchorDate)}
            selectedDate={selectedDate}
            tasksByDay={tasksByDay}
            getListName={getListName}
            onSelectDay={handleSelectDay}
            onSelectTask={setSelectedTaskId}
            selectedTaskId={selectedTaskId}
          />
        );
      case 'day':
        return (
          <DayColumnsView
            days={[anchorDate]}
            selectedDate={selectedDate}
            tasksByDay={tasksByDay}
            getListName={getListName}
            onSelectDay={handleSelectDay}
            onSelectTask={setSelectedTaskId}
            selectedTaskId={selectedTaskId}
            spacious
          />
        );
      case 'multiDay':
        return (
          <DayColumnsView
            days={getMultiDays(anchorDate, MULTI_DAY_COUNT)}
            selectedDate={selectedDate}
            tasksByDay={tasksByDay}
            getListName={getListName}
            onSelectDay={handleSelectDay}
            onSelectTask={setSelectedTaskId}
            selectedTaskId={selectedTaskId}
          />
        );
      case 'multiWeek':
        return (
          <MultiWeekView
            anchor={anchorDate}
            selectedDate={selectedDate}
            tasksByDay={tasksByDay}
            maxVisible={compact ? 0 : 4}
            onSelectDay={handleSelectDay}
          />
        );
      case 'agenda':
        return (
          <AgendaView
            anchor={anchorDate}
            tasksByDay={tasksByDay}
            getListName={getListName}
            onSelectTask={setSelectedTaskId}
            selectedTaskId={selectedTaskId}
            onSelectDay={handleSelectDay}
          />
        );
      case 'month':
      default:
        return (
          <MonthView
            anchor={anchorDate}
            selectedDate={selectedDate}
            tasksByDay={tasksByDay}
            maxVisible={maxVisible}
            onSelectDay={handleSelectDay}
          />
        );
    }
  };

  const currentViewOption =
    CALENDAR_VIEW_OPTIONS.find((option) => option.type === view) ?? CALENDAR_VIEW_OPTIONS[0];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="h-full flex flex-col bg-[var(--dida-surface)] select-none">
        {/* 顶部工具栏 */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <button
                type="button"
                onClick={() => handleNavigate(-1)}
                className="p-1 hover:bg-[var(--dida-bg-hover)] rounded-md transition-colors text-[var(--dida-text-secondary)]"
                title="上一页"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2 py-1 text-[12px] text-[var(--dida-text-secondary)] hover:bg-[var(--dida-bg-hover)] rounded-md transition-colors"
              >
                今天
              </button>
              <button
                type="button"
                onClick={() => handleNavigate(1)}
                className="p-1 hover:bg-[var(--dida-bg-hover)] rounded-md transition-colors text-[var(--dida-text-secondary)]"
                title="下一页"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="relative ml-1 min-w-0">
                <button
                  ref={quickTriggerRef}
                  type="button"
                  onClick={() => setIsQuickPickerOpen((prev) => !prev)}
                  className="flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-[var(--dida-bg-hover)] transition-colors max-w-full"
                  title="点击快速选择年月日"
                >
                  <span className="text-[17px] font-bold text-[var(--dida-text-main)] truncate">
                    {getViewTitle(view, anchorDate)}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[var(--dida-text-tertiary)] shrink-0" />
                </button>

                {isQuickPickerOpen && (
                  <div ref={quickPickerRef}>
                    <QuickDatePicker value={anchorDate} onSelect={handleQuickSelect} />
                  </div>
                )}
              </div>
            </div>

            {/* 视图切换 */}
            <div className="relative shrink-0">
              <button
                ref={viewTriggerRef}
                type="button"
                onClick={() => setIsViewMenuOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2 py-1.5 text-[13px] rounded-md transition-colors ${
                  isViewMenuOpen
                    ? 'bg-[var(--dida-primary-light)] text-[var(--dida-primary)]'
                    : 'text-[var(--dida-text-secondary)] hover:bg-[var(--dida-bg-hover)]'
                }`}
              >
                <currentViewOption.icon className="w-4 h-4" />
                <span>{currentViewOption.label}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isViewMenuOpen && (
                <div
                  ref={viewMenuRef}
                  className="absolute right-0 top-full mt-1 w-36 bg-[var(--dida-elevated)] border border-[var(--dida-border-light)] shadow-xl rounded-xl py-1 z-[400] animate-in fade-in zoom-in-95 duration-100"
                >
                  {CALENDAR_VIEW_OPTIONS.map((option) => {
                    const active = option.type === view;
                    return (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => {
                          setView(option.type);
                          setIsViewMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[13px] transition-colors ${
                          active
                            ? 'text-[var(--dida-primary)] bg-[var(--dida-primary-light)]'
                            : 'text-[var(--dida-text-main)] hover:bg-[var(--dida-bg-hover)]'
                        }`}
                      >
                        <option.icon className="w-4 h-4" />
                        <span className="flex-1 text-left">{option.label}</span>
                        {active && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 主体：日历 + 任务列表 */}
        <div className="flex-1 flex min-h-0">
          <div ref={calendarRef} className="flex-1 min-w-0 flex flex-col min-h-0">
            {renderCalendar()}
          </div>

          {showTaskPanel && (
            <CalendarTaskPanel
              tasks={tasks ?? []}
              lists={lists ?? []}
              range={range}
              anchor={anchorDate}
              onRangeChange={setRange}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
            />
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div className="px-3 py-2 rounded-lg bg-[var(--dida-elevated)] border border-[var(--dida-primary)] shadow-lg max-w-[220px]">
            <div className="text-[13px] text-[var(--dida-text-main)] truncate">
              {activeTask.title || '无标题任务'}
            </div>
            <div className="text-[11px] text-[var(--dida-text-tertiary)]">拖到日期上调整</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
