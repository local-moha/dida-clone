import { useEffect } from 'react';
import { X, Sun, Moon, Monitor, ArrowUpDown, Eye, Keyboard, Info } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useThemeStore, ThemeMode } from '../../store/useThemeStore';
import { useViewStore, TASK_SORT_OPTIONS } from '../../store/useViewStore';
import { SHORTCUTS } from '../../constants/shortcuts';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: '浅色', icon: Sun },
  { mode: 'dark', label: '深色', icon: Moon },
  { mode: 'system', label: '跟随系统', icon: Monitor },
];

interface SectionProps {
  icon: typeof Sun;
  title: string;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, children }: SectionProps) {
  return (
    <div className="px-6 py-5 border-b border-[var(--dida-border-light)] last:border-b-0">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-[var(--dida-text-tertiary)]" />
        <h3 className="text-[13px] font-bold text-[var(--dida-text-main)]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function SettingsModal() {
  const isOpen = useAppStore((s) => s.isSettingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const sortKey = useViewStore((s) => s.sortKey);
  const setSortKey = useViewStore((s) => s.setSortKey);
  const showCompleted = useViewStore((s) => s.showCompleted);
  const setShowCompleted = useViewStore((s) => s.setShowCompleted);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, setSettingsOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[520px] max-h-[80vh] flex flex-col bg-[var(--dida-elevated)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--dida-border-light)] shrink-0">
          <h2 className="text-[17px] font-bold text-[var(--dida-text-main)]">设置</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1 hover:bg-[var(--dida-bg-hover)] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[var(--dida-text-tertiary)]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* 外观 */}
          <Section icon={Sun} title="外观">
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map(({ mode: option, label, icon: Icon }) => {
                const active = mode === option;
                return (
                  <button
                    key={option}
                    onClick={() => setMode(option)}
                    className={`flex flex-col items-center gap-2 py-3 rounded-xl border transition-all ${
                      active
                        ? 'border-[var(--dida-primary)] bg-[var(--dida-primary-light)] text-[var(--dida-primary)]'
                        : 'border-[var(--dida-border-light)] text-[var(--dida-text-secondary)] hover:bg-[var(--dida-bg-hover)]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[12px] font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* 任务视图 */}
          <Section icon={ArrowUpDown} title="任务视图">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[13px] text-[var(--dida-text-main)]">默认排序</div>
                  <div className="text-[11px] text-[var(--dida-text-tertiary)]">
                    {TASK_SORT_OPTIONS.find((o) => o.key === sortKey)?.description}
                  </div>
                </div>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
                  className="px-3 py-1.5 text-[13px] bg-[var(--dida-bg-input)] border border-[var(--dida-border-light)] rounded-lg outline-none focus:border-[var(--dida-primary)] text-[var(--dida-text-main)]"
                >
                  {TASK_SORT_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[var(--dida-text-tertiary)]" />
                  <div>
                    <div className="text-[13px] text-[var(--dida-text-main)]">显示已完成</div>
                    <div className="text-[11px] text-[var(--dida-text-tertiary)]">关闭后列表中隐藏已完成任务</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                    showCompleted ? 'bg-[var(--dida-primary)]' : 'bg-[var(--priority-none)]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      showCompleted ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </Section>

          {/* 快捷键 */}
          <Section icon={Keyboard} title="快捷键">
            <div className="space-y-2">
              {SHORTCUTS.map((shortcut) => (
                <div key={shortcut.description} className="flex items-center justify-between">
                  <span className="text-[13px] text-[var(--dida-text-secondary)]">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="px-2 py-0.5 text-[11px] font-medium text-[var(--dida-text-secondary)] bg-[var(--dida-bg-hover)] border border-[var(--dida-border-light)] rounded"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* 关于 */}
          <Section icon={Info} title="关于">
            <div className="space-y-1 text-[12px] text-[var(--dida-text-secondary)]">
              <div>滴答清单克隆 · v0.1.0</div>
              <div>Tauri + React + TypeScript，数据完全存储在本地 SQLite 数据库中。</div>
              <div className="text-[var(--dida-text-tertiary)]">本项目仅供学习交流，严禁商业用途。</div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
