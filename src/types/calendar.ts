/** 日历视图类型 */
export type CalendarViewType = 'month' | 'week' | 'day' | 'agenda' | 'multiDay' | 'multiWeek';

/** 闭区间日期范围（start 为当天 00:00，end 为当天 23:59:59.999） */
export interface DateRange {
  start: Date;
  end: Date;
}
