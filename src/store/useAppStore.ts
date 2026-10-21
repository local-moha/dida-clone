import { create } from 'zustand';
import { Task } from '../types';

interface AppState {
  selectedListId: string | null;
  selectedTagId: string | null;
  selectedTaskId: string | null;
  viewMode: 'tasks' | 'calendar' | 'search';
  toast: {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    visible: boolean;
  };
  activeReminderTask: Task | null;
  isSidebarCollapsed: boolean;
  isSettingsOpen: boolean;
  searchQuery: string;
  setSelectedListId: (id: string | null) => void;
  setSelectedTagId: (id: string | null) => void;
  setSelectedTaskId: (id: string | null) => void;
  setViewMode: (mode: 'tasks' | 'calendar' | 'search') => void;
  showToast: (message: string, actionLabel?: string, onAction?: () => void) => void;
  hideToast: () => void;
  setActiveReminderTask: (task: Task | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedListId: 'smart_all',
  selectedTagId: null,
  selectedTaskId: null,
  viewMode: 'tasks',
  toast: {
    message: '',
    visible: false,
  },
  activeReminderTask: null,
  isSidebarCollapsed: false,
  isSettingsOpen: false,
  searchQuery: '',
  setSelectedListId: (id) => set({ 
    selectedListId: id, 
    selectedTagId: null,
    selectedTaskId: null, // 切换清单时清空选中的任务
    viewMode: 'tasks',    // 选择清单时回到任务视图
  }),
  setSelectedTagId: (id) => set({ 
    selectedTagId: id, 
    selectedListId: null,
    selectedTaskId: null, // 切换标签时清空选中的任务
    viewMode: 'tasks',    // 选择标签时回到任务视图
  }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  showToast: (message, actionLabel, onAction) => set({
    toast: { message, actionLabel, onAction, visible: true }
  }),
  hideToast: () => set((state) => ({
    toast: { ...state.toast, visible: false }
  })),
  setActiveReminderTask: (task) => set({ activeReminderTask: task }),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
