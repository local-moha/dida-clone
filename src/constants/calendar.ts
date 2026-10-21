import { CalendarDays, CalendarRange, Columns3, Rows3, List, Square } from 'lucide-react';
import { CalendarViewType } from '../types/calendar';

export interface CalendarViewOption {
  type: CalendarViewType;
  label: string;
  icon: typeof CalendarDays;
}

/** 日历视图列表（顺序即下拉菜单顺序） */
export const CALENDAR_VIEW_OPTIONS: CalendarViewOption[] = [
  { type: 'month', label: '月视图', icon: CalendarDays },
  { type: 'week', label: '周视图', icon: Columns3 },
  { type: 'day', label: '日视图', icon: Square },
  { type: 'agenda', label: '日程', icon: List },
  { type: 'multiDay', label: '多日视图', icon: CalendarRange },
  { type: 'multiWeek', label: '多周视图', icon: Rows3 },
];

/** 多日视图显示的连续天数 */
export const MULTI_DAY_COUNT = 3;
/** 多周视图显示的连续周数 */
export const MULTI_WEEK_COUNT = 3;
/** 日程视图向后展示的天数 */
export const AGENDA_DAY_COUNT = 45;

export const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
