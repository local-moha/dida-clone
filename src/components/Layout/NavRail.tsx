import { useAppStore } from '../../store/useAppStore';
import { useThemeStore } from '../../store/useThemeStore';
import { CheckSquare, Calendar, Search, Settings, Sun, Moon } from 'lucide-react';

export default function NavRail() {
    const { viewMode, setViewMode, setSettingsOpen } = useAppStore();
    const resolvedTheme = useThemeStore((s) => s.resolved);
    const toggleTheme = useThemeStore((s) => s.toggle);

    const items = [
        { key: 'tasks' as const, icon: CheckSquare, label: '任务' },
        { key: 'calendar' as const, icon: Calendar, label: '日历' },
        { key: 'search' as const, icon: Search, label: '搜索' },
    ];

    return (
        <div className="w-[60px] h-full bg-[var(--dida-rail)] border-r border-[var(--dida-border-light)] flex flex-col items-center py-4 text-[var(--dida-text-secondary)] z-50 flex-shrink-0">
            {/* 用户头像 */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold mb-6 cursor-pointer hover:opacity-90 transition-opacity shadow-sm select-none">
                AK
            </div>

            {/* 核心导航 */}
            <div className="flex flex-col gap-4 w-full items-center px-2">
                {items.map(({ key, icon: Icon, label }) => (
                    <button
                        key={key}
                        onClick={() => setViewMode(key)}
                        className={`nav-item w-10 h-10 flex items-center justify-center rounded-xl transition-all ${viewMode === key
                            ? 'bg-[var(--dida-elevated)] text-[var(--dida-primary)] shadow-sm'
                            : 'hover:bg-[var(--dida-bg-hover)]/50 text-[var(--dida-text-secondary)]'
                            }`}
                        title={label}
                    >
                        <Icon className="w-5 h-5" />
                    </button>
                ))}
            </div>

            <div className="flex-1" />

            {/* 底部功能 */}
            <div className="flex flex-col gap-2 mb-2">
                <button
                    onClick={toggleTheme}
                    className="p-2 hover:bg-[var(--dida-bg-hover)]/50 rounded-lg transition-colors text-[var(--dida-text-tertiary)] hover:text-[var(--dida-text-main)]"
                    title={resolvedTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
                >
                    {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button
                    onClick={() => setSettingsOpen(true)}
                    className="p-2 hover:bg-[var(--dida-bg-hover)]/50 rounded-lg transition-colors text-[var(--dida-text-tertiary)] hover:text-[var(--dida-text-main)]"
                    title="设置"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
