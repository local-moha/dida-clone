import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { isNativeImeComposing } from '../utils/keyboard';

const isEditableTarget = (element: Element | null): boolean => {
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (element as HTMLElement).isContentEditable
  );
};

export function useShortcuts() {
    const setSelectedTaskId = useAppStore((s) => s.setSelectedTaskId);
    const setViewMode = useAppStore((s) => s.setViewMode);
    const toggleSidebar = useAppStore((s) => s.toggleSidebar);
    const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 输入法组合输入期间（中文/日文等）不响应任何全局快捷键，
            // 否则 Esc 会被当成"关闭面板"，导致正在输入的候选词丢失
            if (isNativeImeComposing(e)) return;

            // Ctrl / Cmd 组合键（在输入框内同样生效）
            if (e.metaKey || e.ctrlKey) {
                switch (e.key.toLowerCase()) {
                    case 'f':
                        e.preventDefault();
                        setViewMode('search');
                        break;
                    case 'b':
                        e.preventDefault();
                        toggleSidebar();
                        break;
                    case ',':
                        e.preventDefault();
                        setSettingsOpen(true);
                        break;
                    default:
                        break;
                }
                return;
            }

            if (isEditableTarget(document.activeElement)) {
                // 在输入框中按下 Escape 键失焦
                if (e.key === 'Escape') {
                    (document.activeElement as HTMLElement).blur();
                }
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'n':
                    e.preventDefault();
                    setViewMode('tasks');
                    // 发送自定义事件，由 TaskList 监听并聚焦输入框
                    window.dispatchEvent(new CustomEvent('focus-task-input'));
                    break;
                case 'e':
                    e.preventDefault();
                    // 关闭任务详情面板
                    setSelectedTaskId(null);
                    break;
                case 'escape':
                    // 全局 Esc 关闭详情
                    setSelectedTaskId(null);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setSelectedTaskId, setViewMode, toggleSidebar, setSettingsOpen]);
}
