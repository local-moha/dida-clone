import { Priority } from '../types';

export interface PriorityFilterOption {
  value: Priority | null;
  label: string;
  color: string;
}

/** 任务列表的优先级筛选选项（null = 全部） */
export const PRIORITY_FILTER_OPTIONS: PriorityFilterOption[] = [
  { value: null, label: '全部优先级', color: 'var(--dida-text-tertiary)' },
  { value: Priority.High, label: '高', color: 'var(--priority-high)' },
  { value: Priority.Medium, label: '中', color: 'var(--priority-medium)' },
  { value: Priority.Low, label: '低', color: 'var(--priority-low)' },
  { value: Priority.None, label: '无', color: 'var(--priority-none)' },
];
