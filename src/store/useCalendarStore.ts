import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CalendarViewType } from '../types/calendar';

interface CalendarState {
  view: CalendarViewType;
  setView: (view: CalendarViewType) => void;
}

/** 日历偏好（记住上次选择的视图） */
export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      view: 'month',
      setView: (view) => set({ view }),
    }),
    {
      name: 'dida-calendar-prefs',
      version: 1,
      partialize: (state) => ({ view: state.view }),
    }
  )
);
