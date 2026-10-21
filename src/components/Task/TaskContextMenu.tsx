import React, { useMemo, useState } from 'react';
import {
  Sun,
  Sunrise,
  CalendarDays,
  CalendarRange,
  Calendar,
  Flag,
  ListTree,
  ArrowUpToLine,
  FolderInput,
  Tag as TagIcon,
  Copy,
  Link,
  Link2,
  Archive,
  Target,
  FileText,
  Trash2,
  ChevronRight,
  RotateCcw,
  XCircle,
  Check,
} from 'lucide-react';
import { Task, Priority } from '../../types';
import ContextMenu, { ContextMenuSeparator } from '../Common/ContextMenu';
import TagSelectorPopover from './TagSelectorPopover';
import { getPriorityTextClass, getPriorityBgColor } from '../../utils/priority';
import { useLists } from '../../hooks/useLists';
import { SMART_LIST_IDS } from '../../constants/smartLists';

interface TaskContextMenuProps {
  x: number;
  y: number;
  task: Task;
  isTrashView?: boolean;
  onClose: () => void;
  onSetPriority: (priority: Priority) => void;
  onSetDate: (days: number | null) => void;
  onOpenDatePicker: () => void;
  onDelete: () => void;
  onRestore?: () => void;
  onDeletePermanently?: () => void;
  onAddSubtask: () => void;
  onUpdateTags: (tagIds: string[]) => void;
  onPin: () => void;
  onMoveToList: (listId: string) => void;
  onDuplicate: () => void;
  onCopyLink: () => void;
}

type SubmenuType = 'lists' | 'tags';

interface SubmenuState {
  type: SubmenuType;
  /** 相对菜单容器的垂直偏移 */
  top: number;
  /** 右侧空间不足时向左展开 */
  flip: boolean;
}

const SUBMENU_WIDTH: Record<SubmenuType, number> = {
  lists: 200,
  tags: 244,
};

/** 估算高度，用于防止子菜单溢出窗口底部 */
const SUBMENU_HEIGHT: Record<SubmenuType, number> = {
  lists: 320,
  tags: 420,
};

export default function TaskContextMenu({
  x,
  y,
  task,
  isTrashView,
  onClose,
  onSetPriority,
  onSetDate,
  onOpenDatePicker,
  onDelete,
  onRestore,
  onDeletePermanently,
  onAddSubtask,
  onUpdateTags,
  onPin,
  onMoveToList,
  onDuplicate,
  onCopyLink,
}: TaskContextMenuProps) {
  const [submenu, setSubmenu] = useState<SubmenuState | null>(null);
  const { data: lists } = useLists();

  // 只能移动到真实清单（收集箱虽然是智能清单，但可以存放任务）
  const moveTargets = useMemo(
    () => (lists ?? []).filter((list) => !list.is_smart || list.id === SMART_LIST_IDS.INBOX),
    [lists]
  );

  const closeSubmenu = () => setSubmenu(null);

  // 级联子菜单：悬浮或点击时贴着菜单项右侧展开，空间不足则向左翻
  const openSubmenu = (type: SubmenuType, el: HTMLElement | null) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const flip = rect.right + SUBMENU_WIDTH[type] + 8 > window.innerWidth;

    // 菜单容器的视口顶部 = 菜单项的视口 top - 它在容器内的偏移
    const containerTop = rect.top - el.offsetTop;
    const maxTop = window.innerHeight - SUBMENU_HEIGHT[type] - 8 - containerTop;
    const top = Math.max(4, Math.min(el.offsetTop - 4, maxTop));

    setSubmenu({ type, top, flip });
  };

  if (isTrashView) {
    return (
      <ContextMenu x={x} y={y} onClose={onClose}>
        <div className="w-[180px] bg-[var(--dida-elevated)] rounded-lg overflow-hidden py-1">
          <MenuItem 
            icon={<RotateCcw className="w-4 h-4" />} 
            label="恢复任务" 
            onClick={() => { onRestore?.(); onClose(); }} 
          />
          <MenuItem 
            icon={<XCircle className="w-4 h-4" />} 
            label="永久删除" 
            onClick={() => { onDeletePermanently?.(); onClose(); }} 
            danger 
          />
        </div>
      </ContextMenu>
    );
  }

  return (
    <ContextMenu x={x} y={y} onClose={onClose} overflowVisible>
      <div className="w-[220px] bg-[var(--dida-elevated)] rounded-lg overflow-hidden shadow-xl border border-[var(--dida-border-light)]">
        {/* 日期部分 */}
        <div className="px-3 py-2" onMouseEnter={closeSubmenu}>
          <div className="text-[11px] text-[var(--dida-text-tertiary)] mb-2">日期</div>
          <div className="flex items-center justify-between px-1">
            <button 
              onClick={() => { onSetDate(0); onClose(); }}
              className="p-1.5 hover:bg-[var(--dida-bg-hover)] rounded-md text-[var(--dida-text-secondary)] transition-colors"
              title="今天"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { onSetDate(1); onClose(); }}
              className="p-1.5 hover:bg-[var(--dida-bg-hover)] rounded-md text-[var(--dida-text-secondary)] transition-colors"
              title="明天"
            >
              <Sunrise className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { onSetDate(7); onClose(); }}
              className="p-1.5 hover:bg-[var(--dida-bg-hover)] rounded-md text-[var(--dida-text-secondary)] transition-colors"
              title="下周"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { onSetDate(30); onClose(); }}
              className="p-1.5 hover:bg-[var(--dida-bg-hover)] rounded-md text-[var(--dida-text-secondary)] transition-colors"
              title="下月"
            >
              <CalendarRange className="w-4 h-4" />
            </button>
            <button 
              onClick={() => { onOpenDatePicker(); onClose(); }}
              className="p-1.5 hover:bg-[var(--dida-bg-hover)] rounded-md text-[var(--dida-text-secondary)] transition-colors"
              title="自定义日期与提醒"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>

        <ContextMenuSeparator />

        {/* 优先级部分 */}
        <div className="px-3 py-2" onMouseEnter={closeSubmenu}>
          <div className="text-[11px] text-[var(--dida-text-tertiary)] mb-2">优先级</div>
          <div className="flex items-center justify-between px-1">
            {[
              { value: Priority.High, label: '高优先级', fill: true },
              { value: Priority.Medium, label: '中优先级', fill: true },
              { value: Priority.Low, label: '低优先级', fill: true },
              { value: Priority.None, label: '无优先级', fill: false },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => { onSetPriority(item.value); onClose(); }}
                className={`p-1.5 hover:bg-[var(--dida-bg-hover)] rounded-md transition-colors ${getPriorityTextClass(item.value)}`}
                style={{
                  backgroundColor:
                    task.priority === item.value
                      ? getPriorityBgColor(item.value, false)
                      : undefined,
                }}
                title={item.label}
              >
                <Flag className={`w-4 h-4 ${item.fill ? 'fill-current' : ''}`} />
              </button>
            ))}
          </div>
        </div>

        <ContextMenuSeparator />

        {/* 操作列表 */}
        <div className="py-1" onMouseEnter={closeSubmenu}>
          <MenuItem onHover={closeSubmenu} icon={<ListTree className="w-4 h-4" />} label="添加子任务" onClick={() => { onAddSubtask(); onClose(); }} />
          <MenuItem icon={<Link2 className="w-4 h-4" />} label="关联主任务" disabled />
          <MenuItem onHover={closeSubmenu} icon={<ArrowUpToLine className="w-4 h-4" />} label="置顶" onClick={() => { onPin(); onClose(); }} />
          <MenuItem icon={<Archive className="w-4 h-4" />} label="放弃" disabled />
          <MenuItem
            icon={<FolderInput className="w-4 h-4" />}
            label="移动到"
            onClick={(el) => openSubmenu('lists', el)}
            onHover={(el) => openSubmenu('lists', el)}
            hasSubmenu
            active={submenu?.type === 'lists'}
          />
          <MenuItem
            icon={<TagIcon className="w-4 h-4" />}
            label="标签"
            onClick={(el) => openSubmenu('tags', el)}
            onHover={(el) => openSubmenu('tags', el)}
            hasSubmenu
            active={submenu?.type === 'tags'}
          />
          <MenuItem icon={<Target className="w-4 h-4" />} label="开始专注" disabled hasSubmenu />
          <ContextMenuSeparator />
          <MenuItem onHover={closeSubmenu} icon={<Copy className="w-4 h-4" />} label="创建副本" onClick={() => { onDuplicate(); onClose(); }} />
          <MenuItem onHover={closeSubmenu} icon={<Link className="w-4 h-4" />} label="复制链接" onClick={() => { onCopyLink(); onClose(); }} />
          <MenuItem icon={<FileText className="w-4 h-4" />} label="转换为笔记" disabled />
          <ContextMenuSeparator />
          <MenuItem 
            onHover={closeSubmenu}
            icon={<Trash2 className="w-4 h-4" />} 
            label="删除" 
            onClick={() => { onDelete(); onClose(); }} 
            danger 
          />
        </div>
      </div>

      {/* ---- 级联子菜单 ---- */}
      {submenu?.type === 'lists' && (
        <div
          className="absolute z-[1] w-[200px] bg-[var(--dida-elevated)] rounded-lg border border-[var(--dida-border-light)] shadow-xl py-1 animate-in fade-in duration-75"
          style={{
            top: submenu.top,
            left: submenu.flip ? undefined : 'calc(100% - 4px)',
            right: submenu.flip ? 'calc(100% - 4px)' : undefined,
          }}
        >
          <div className="px-3 py-1.5 text-[11px] font-bold text-[var(--dida-text-tertiary)]">
            移动到清单
          </div>
          <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
            {moveTargets.map((list) => {
              const isCurrent = list.id === task.list_id;
              return (
                <button
                  key={list.id}
                  onClick={() => {
                    if (!isCurrent) onMoveToList(list.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors ${
                    isCurrent
                      ? 'text-[var(--dida-primary)] bg-[var(--dida-primary-light)]'
                      : 'text-[var(--dida-text-main)] hover:bg-[var(--dida-bg-hover)]'
                  }`}
                >
                  <span className="text-[15px] w-5 text-center">{list.icon}</span>
                  <span className="flex-1 text-left truncate">{list.name}</span>
                  {isCurrent && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
            {moveTargets.length === 0 && (
              <div className="px-3 py-3 text-[12px] text-[var(--dida-text-tertiary)]">暂无可用清单</div>
            )}
          </div>
        </div>
      )}

      {submenu?.type === 'tags' && (
        <div
          className="absolute z-[1] w-[240px] bg-[var(--dida-elevated)] rounded-lg border border-[var(--dida-border-light)] shadow-xl overflow-hidden animate-in fade-in duration-75"
          style={{
            top: submenu.top,
            left: submenu.flip ? undefined : 'calc(100% - 4px)',
            right: submenu.flip ? 'calc(100% - 4px)' : undefined,
          }}
        >
          <TagSelectorPopover
            selectedTagIds={task.tags || []}
            onConfirm={(tagIds) => {
              onUpdateTags(tagIds);
              onClose();
            }}
            onCancel={closeSubmenu}
          />
        </div>
      )}
    </ContextMenu>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: (el: HTMLButtonElement) => void;
  danger?: boolean;
  hasSubmenu?: boolean;
  /** 置灰占位：功能尚未实现 */
  disabled?: boolean;
  /** 子菜单已展开 */
  active?: boolean;
  onHover?: (el: HTMLButtonElement) => void;
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
  hasSubmenu,
  disabled,
  active,
  onHover,
}: MenuItemProps) {
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      title={disabled ? '功能开发中，敬请期待' : undefined}
      onMouseEnter={(e) => {
        if (!disabled) onHover?.(e.currentTarget);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick?.(e.currentTarget);
      }}
      className={`w-full flex items-center gap-3 px-3 py-1.5 text-[13px] transition-colors ${
        disabled
          ? 'text-[var(--dida-text-tertiary)] opacity-45 cursor-not-allowed'
          : danger
            ? 'text-red-500 hover:bg-[var(--dida-bg-hover)]'
            : active
              ? 'bg-[var(--dida-bg-hover)] text-[var(--dida-text-main)]'
              : 'text-[var(--dida-text-main)] hover:bg-[var(--dida-bg-hover)]'
      }`}
    >
      <span className={`${danger && !disabled ? 'text-red-500' : 'text-[var(--dida-text-tertiary)]'}`}>
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {disabled && <span className="text-[10px] text-[var(--dida-text-tertiary)]">待开发</span>}
      {!disabled && hasSubmenu && (
        <ChevronRight className="w-3.5 h-3.5 text-[var(--dida-text-tertiary)]" />
      )}
    </button>
  );
}
