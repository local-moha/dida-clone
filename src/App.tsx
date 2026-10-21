import { useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainLayout from './components/Layout/MainLayout';
import TaskList from './components/Task/TaskList';
import TaskDetail from './components/Task/TaskDetail';
import SearchView from './components/Search/SearchView';
import CalendarView from './components/Calendar/CalendarView';
import Toast from './components/Common/Toast';
import AlertDialog from './components/Common/AlertDialog';
import SettingsModal from './components/Common/SettingsModal';
import ReminderManager from './components/Task/ReminderManager';
import { useAppStore } from './store/useAppStore';
import { useElementWidth } from './hooks/useElementWidth';
import { CALENDAR_BREAKPOINTS } from './constants/layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Workspace() {
  const viewMode = useAppStore((s) => s.viewMode);
  const selectedTaskId = useAppStore((s) => s.selectedTaskId);
  const workspaceRef = useRef<HTMLDivElement>(null);
  // 以整个工作区的宽度做断点判断（不受右侧详情面板显隐影响，避免来回抖动）
  const workspaceWidth = useElementWidth(workspaceRef);

  const isCalendar = viewMode === 'calendar';
  // 日历视图响应式：窄→仅日历，中/宽→日历 + 任务列表（详情不再并排占位）
  const showTaskPanel = !isCalendar || workspaceWidth >= CALENDAR_BREAKPOINTS.dayPanel;

  return (
    <MainLayout>
      <div ref={workspaceRef} className="relative flex h-full w-full min-w-0">
        <div className="flex-1 min-w-0">
          {viewMode === 'search' && <SearchView />}
          {viewMode === 'calendar' && <CalendarView showTaskPanel={showTaskPanel} />}
          {viewMode === 'tasks' && <TaskList />}
        </div>

        {/* 任务 / 搜索视图：点击任务后详情作为右侧分栏显示（未选中时不渲染） */}
        {!isCalendar && <TaskDetail />}

        {/* 日历视图：只展示日历 + 任务列表，详情以浮层形式按需弹出（只读） */}
        {isCalendar && selectedTaskId && (
          <div className="absolute right-0 top-0 bottom-0 z-40 flex overflow-hidden shadow-2xl animate-in slide-in-from-right-2 duration-150">
            <TaskDetail readOnly />
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Workspace />
      <Toast />
      <AlertDialog />
      <SettingsModal />
      <ReminderManager />
    </QueryClientProvider>
  );
}

export default App;
