import { Task } from '../types';
import { TaskSortKey } from '../store/useViewStore';

const collator = new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' });

/**
 * 按指定字段排序任务（不修改原数组）
 */
export const sortTasks = (tasks: Task[], key: TaskSortKey): Task[] => {
  const list = [...tasks];

  switch (key) {
    case 'dueDate':
      return list.sort((a, b) => {
        // 无日期的统一排在最后
        if (a.due_date === null && b.due_date === null) return a.order - b.order;
        if (a.due_date === null) return 1;
        if (b.due_date === null) return -1;
        return a.due_date - b.due_date || a.order - b.order;
      });

    case 'priority':
      return list.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        // 优先级相同时，过期/临近的任务靠前
        if (a.due_date === null && b.due_date === null) return a.order - b.order;
        if (a.due_date === null) return 1;
        if (b.due_date === null) return -1;
        return a.due_date - b.due_date || a.order - b.order;
      });

    case 'title':
      return list.sort((a, b) => collator.compare(a.title, b.title));

    case 'createdAt':
      return list.sort((a, b) => b.created_at - a.created_at);

    case 'default':
    default:
      return list.sort((a, b) => a.order - b.order);
  }
};

export interface TaskFilterOptions {
  /** 是否显示已完成任务 */
  showCompleted: boolean;
  /** 优先级筛选，null 为全部 */
  priority: number | null;
}

/**
 * 根据视图筛选条件过滤任务
 */
export const filterTasks = (tasks: Task[], options: TaskFilterOptions): Task[] =>
  tasks.filter((task) => {
    if (!options.showCompleted && task.completed) return false;
    if (options.priority !== null && task.priority !== options.priority) return false;
    return true;
  });
