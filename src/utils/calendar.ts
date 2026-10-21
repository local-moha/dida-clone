import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarViewType, DateRange } from '../types/calendar';
import { AGENDA_DAY_COUNT, MULTI_DAY_COUNT, MULTI_WEEK_COUNT } from '../constants/calendar';

export const WEEK_STARTS_ON = 1;

/** yyyy-MM-dd，用于按天分组 */
export const dayKey = (date: Date): string => format(date, 'yyyy-MM-dd');

/** 毫秒时间戳 -> 秒级（项目统一存秒） */
export const toSeconds = (date: Date): number => Math.floor(date.getTime() / 1000);

/** 兼容秒/毫秒时间戳 */
export const toDate = (timestamp: number): Date =>
  new Date(timestamp > 10000000000 ? timestamp : timestamp * 1000);

export const dayRange = (date: Date): DateRange => ({
  start: startOfDay(date),
  end: endOfDay(date),
});

export const monthRange = (date: Date): DateRange => ({
  start: startOfMonth(date),
  end: endOfMonth(date),
});

export const weekRange = (date: Date): DateRange => ({
  start: startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
  end: endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON }),
});

export const multiDayRange = (date: Date, count = MULTI_DAY_COUNT): DateRange => ({
  start: startOfDay(date),
  end: endOfDay(addDays(date, count - 1)),
});

export const multiWeekRange = (date: Date, count = MULTI_WEEK_COUNT): DateRange => {
  const start = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  return {
    start,
    end: endOfWeek(addWeeks(start, count - 1), { weekStartsOn: WEEK_STARTS_ON }),
  };
};

export const agendaRange = (date: Date): DateRange => ({
  start: startOfDay(date),
  end: endOfDay(addDays(date, AGENDA_DAY_COUNT - 1)),
});

/**
 * 当前视图对应的可见日期范围；日程视图返回 null（表示不限日期）
 */
export const getVisibleRange = (view: CalendarViewType, anchor: Date): DateRange | null => {
  switch (view) {
    case 'month':
      return monthRange(anchor);
    case 'week':
      return weekRange(anchor);
    case 'day':
      return dayRange(anchor);
    case 'multiDay':
      return multiDayRange(anchor);
    case 'multiWeek':
      return multiWeekRange(anchor);
    case 'agenda':
    default:
      return null;
  }
};

/** 月视图的 6×7 网格（含前后补白） */
export const getMonthGridDays = (anchor: Date): Date[] => {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: WEEK_STARTS_ON });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: WEEK_STARTS_ON });
  const days: Date[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
};

export const getWeekDays = (date: Date): Date[] => {
  const start = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const getMultiDays = (date: Date, count = MULTI_DAY_COUNT): Date[] => {
  const start = startOfDay(date);
  return Array.from({ length: count }, (_, i) => addDays(start, i));
};

export const getMultiWeeks = (date: Date, count = MULTI_WEEK_COUNT): Date[][] => {
  const firstWeekStart = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: count }, (_, w) =>
    getWeekDays(addWeeks(firstWeekStart, w))
  );
};

/** 上一个 / 下一个视图单位 */
export const shiftAnchor = (view: CalendarViewType, anchor: Date, direction: 1 | -1): Date => {
  switch (view) {
    case 'week':
      return addWeeks(anchor, direction);
    case 'day':
      return addDays(anchor, direction);
    case 'multiDay':
      return addDays(anchor, direction * MULTI_DAY_COUNT);
    case 'multiWeek':
      return addWeeks(anchor, direction * MULTI_WEEK_COUNT);
    case 'agenda':
      return addDays(anchor, direction * 14);
    case 'month':
    default:
      return addMonths(anchor, direction);
  }
};

/** 顶部标题文案 */
export const getViewTitle = (view: CalendarViewType, anchor: Date): string => {
  switch (view) {
    case 'month':
      return format(anchor, 'yyyy年M月', { locale: zhCN });
    case 'week': {
      const range = weekRange(anchor);
      return `${format(range.start, 'yyyy年M月d日')} - ${format(range.end, 'M月d日')}`;
    }
    case 'day':
      return format(anchor, 'yyyy年M月d日 EEEE', { locale: zhCN });
    case 'multiDay': {
      const range = multiDayRange(anchor);
      return `${format(range.start, 'M月d日')} - ${format(range.end, 'M月d日')}`;
    }
    case 'multiWeek': {
      const range = multiWeekRange(anchor);
      return `${format(range.start, 'yyyy年M月d日')} - ${format(range.end, 'M月d日')}`;
    }
    case 'agenda':
    default:
      return `${format(anchor, 'yyyy年M月d日')} 起`;
  }
};

/** 任务列筛选范围文案 */
export const formatRangeLabel = (range: DateRange | null): string => {
  if (!range) return '全部日期';
  if (isSameDay(range.start, range.end)) {
    return format(range.start, 'M月d日 EEEE', { locale: zhCN });
  }
  return `${format(range.start, 'M月d日')} - ${format(range.end, 'M月d日')}`;
};

export const isSameRange = (a: DateRange | null, b: DateRange | null): boolean => {
  if (!a || !b) return a === b;
  return isSameDay(a.start, b.start) && isSameDay(a.end, b.end);
};

/** 任务是否落在范围内（按日期比较，忽略时分秒） */
export const isDateInRange = (timestamp: number | null, range: DateRange | null): boolean => {
  if (!range) return true;
  if (!timestamp) return false;
  const date = toDate(timestamp);
  return date >= range.start && date <= range.end;
};

/**
 * 把任务调整到目标日期：保留原来的时间，没有时间则默认 09:00
 */
export const applyDateToTask = (
  dueDate: number | null,
  target: Date
): number => {
  const next = new Date(target);
  if (dueDate) {
    const source = toDate(dueDate);
    const hasTime = source.getHours() !== 0 || source.getMinutes() !== 0;
    next.setHours(
      hasTime ? source.getHours() : 9,
      hasTime ? source.getMinutes() : 0,
      0,
      0
    );
  } else {
    next.setHours(9, 0, 0, 0);
  }
  return toSeconds(next);
};
