import { useRef } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { LIST_COLORS, LIST_ICONS } from '../../constants/listStyles';
import { useClickOutside } from '../../hooks/useClickOutside';

interface ListContextMenuProps {
  x: number;
  y: number;
  currentIcon: string;
  currentColor: string;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onPickIcon: (icon: string) => void;
  onPickColor: (color: string) => void;
}

const MENU_WIDTH = 216;
const MENU_HEIGHT = 320;

export default function ListContextMenu({
  x,
  y,
  currentIcon,
  currentColor,
  onClose,
  onRename,
  onDelete,
  onPickIcon,
  onPickColor,
}: ListContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside([menuRef], onClose, true);

  // 确保菜单不超出屏幕
  const adjustedX = Math.max(8, Math.min(x, window.innerWidth - MENU_WIDTH - 8));
  const adjustedY = Math.max(8, Math.min(y, window.innerHeight - MENU_HEIGHT - 8));

  return (
    <div
      ref={menuRef}
      className="fixed z-[1000] bg-[var(--dida-elevated)] rounded-xl shadow-2xl border border-[var(--dida-border-light)] py-1.5 animate-in fade-in zoom-in-95 duration-100"
      style={{ top: adjustedY, left: adjustedX, width: MENU_WIDTH }}
    >
      <button
        onClick={() => {
          onRename();
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-[var(--dida-text-main)] hover:bg-[var(--dida-bg-hover)] transition-colors"
      >
        <Pencil className="w-4 h-4 text-[var(--dida-text-tertiary)]" />
        重命名清单
      </button>

      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-2 text-[14px] text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-4 h-4 text-red-500" />
        删除清单
      </button>

      <div className="h-[1px] bg-[var(--dida-border-light)] my-1.5 mx-3" />

      <div className="px-4 pb-1.5 text-[11px] font-bold text-[var(--dida-text-tertiary)] uppercase tracking-wider">
        图标
      </div>
      <div className="px-3 grid grid-cols-6 gap-1">
        {LIST_ICONS.map((icon) => (
          <button
            key={icon}
            onClick={(e) => {
              e.stopPropagation();
              onPickIcon(icon);
              onClose();
            }}
            className={`h-7 rounded-md flex items-center justify-center text-[15px] transition-colors ${
              currentIcon === icon
                ? 'bg-[var(--dida-primary-light)] ring-1 ring-[var(--dida-primary)]'
                : 'hover:bg-[var(--dida-bg-hover)]'
            }`}
          >
            {icon}
          </button>
        ))}
      </div>

      <div className="h-[1px] bg-[var(--dida-border-light)] my-1.5 mx-3" />

      <div className="px-4 pb-1.5 text-[11px] font-bold text-[var(--dida-text-tertiary)] uppercase tracking-wider">
        颜色
      </div>
      <div className="px-3 pb-1 flex items-center gap-2 flex-wrap">
        {LIST_COLORS.map((color) => (
          <button
            key={color}
            onClick={(e) => {
              e.stopPropagation();
              onPickColor(color);
              onClose();
            }}
            className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
              currentColor === color ? 'ring-2 ring-offset-2 ring-[var(--dida-border-light)]' : ''
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}
