import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Priority } from '../types';

export type TaskSortKey = 'default' | 'dueDate' | 'priority' | 'title' | 'createdAt';

export interface TaskSortOption {
  key: TaskSortKey;
  label: string;
  description: string;
}

export const TASK_SORT_OPTIONS: TaskSortOption[] = [
  { key: 'default', label: '自定义顺序', description: '按你拖拽的顺序排列' },
  { key: 'dueDate', label: '截止日期', description: '日期靠前的排在最前' },
  { key: 'priority', label: '优先级', description: '高 → 中 → 低 → 无' },
  { key: 'title', label: '标题', description: '按标题拼音 / 字母排序' },
  { key: 'createdAt', label: '创建时间', description: '最新创建的排在最前' },
];

/** 优先级筛选：null 表示全部 */
export type PriorityFilter = Priority | null;

interface ViewState {
  sortKey: TaskSortKey;
  showCompleted: boolean;
  priorityFilter: PriorityFilter;
  setSortKey: (key: TaskSortKey) => void;
  setShowCompleted: (show: boolean) => void;
  setPriorityFilter: (priority: PriorityFilter) => void;
  resetViewOptions: () => void;
}

const DEFAULT_VIEW = {
  // 默认按优先级自动排序：高 → 中 → 低 → 无
  sortKey: 'priority' as TaskSortKey,
  showCompleted: true,
  priorityFilter: null as PriorityFilter,
};

const PERSIST_VERSION = 2;

export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      ...DEFAULT_VIEW,
      setSortKey: (sortKey) => set({ sortKey }),
      setShowCompleted: (showCompleted) => set({ showCompleted }),
      setPriorityFilter: (priorityFilter) => set({ priorityFilter }),
      resetViewOptions: () => set({ ...DEFAULT_VIEW }),
    }),
    {
      name: 'dida-view-prefs',
      version: PERSIST_VERSION,
      partialize: (state) => ({
        sortKey: state.sortKey,
        showCompleted: state.showCompleted,
        priorityFilter: state.priorityFilter,
      }),
      // migrate 只会在本地存储版本落后时执行
      migrate: (persisted) => {
        const state = (persisted ?? {}) as {
          sortKey?: TaskSortKey;
          showCompleted?: boolean;
          priorityFilter?: PriorityFilter;
        };
        return {
          // 旧版本默认是“自定义顺序”，升级后改为按优先级自动排序
          sortKey:
            !state.sortKey || state.sortKey === 'default'
              ? ('priority' as TaskSortKey)
              : state.sortKey,
          showCompleted: state.showCompleted ?? true,
          priorityFilter: state.priorityFilter ?? null,
        };
      },
    }
  )
);
