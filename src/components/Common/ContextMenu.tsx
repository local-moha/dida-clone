import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    children: React.ReactNode;
    /** 允许内容溢出（用于级联子菜单），默认裁切以保持圆角 */
    overflowVisible?: boolean;
}

export default function ContextMenu({ x, y, onClose, children, overflowVisible }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = React.useState({ left: x, top: y });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // 滚动页面时关闭菜单，但菜单内部（如子菜单列表）滚动不应关闭
        const handleScroll = (event: Event) => {
            if (menuRef.current && event.target instanceof Node && menuRef.current.contains(event.target)) {
                return;
            }
            onClose();
        };

        // 监听滚动和点击，关闭菜单
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, { capture: true });

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, { capture: true });
        };
    }, [onClose]);

    // 边界检查：确保不超出窗口
    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            let adjustedX = x;
            let adjustedY = y;

            // 检查右侧边界
            if (x + rect.width > window.innerWidth) {
                adjustedX = window.innerWidth - rect.width - 8;
            }

            // 检查底部边界
            if (y + rect.height > window.innerHeight) {
                adjustedY = window.innerHeight - rect.height - 8;
            }

            // 确保不超出左侧和顶部
            adjustedX = Math.max(8, adjustedX);
            adjustedY = Math.max(8, adjustedY);

            setPos({ left: adjustedX, top: adjustedY });
        }
    }, [x, y]);

    return (
        <div
            ref={menuRef}
            className={`fixed z-[9999] bg-[var(--dida-elevated)] border border-[var(--dida-border-light)] rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.15)] min-w-[160px] ${overflowVisible ? 'overflow-visible' : 'overflow-hidden'}`}
            style={{ left: pos.left, top: pos.top }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {children}
        </div>
    );
}

interface ContextMenuItemProps {
    icon?: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
    active?: boolean;
}

export function ContextMenuItem({
    icon,
    label,
    onClick,
    danger = false,
    active = false
}: ContextMenuItemProps) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2 text-[13px] transition-colors ${active
                    ? 'bg-[var(--dida-primary-light)] text-[var(--dida-primary)]'
                    : danger
                        ? 'text-red-500 hover:bg-red-50'
                        : 'text-[var(--dida-text-main)] hover:bg-[var(--dida-bg-hover)]'
                }`}
        >
            {icon && <span className={`${active ? 'text-[var(--dida-primary)]' : 'text-[var(--dida-text-tertiary)]'}`}>{icon}</span>}
            <span className="flex-1 text-left font-medium">{label}</span>
        </button>
    );
}

export function ContextMenuSeparator() {
    return <div className="h-px bg-[var(--dida-border-light)] my-1 mx-1" />;
}
