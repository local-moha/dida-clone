import { useTask, useSubtasks, useCreateSubtaskSimple, useUpdateTaskOrders, useUpdateTask, useUndoDeleteTask, useDeleteTaskPermanently, useDeleteTask, useToggleTask, useCreateTask } from '../../hooks/useTasks';
import { useTags, useCreateTag } from '../../hooks/useTags';
import { useAppStore } from '../../store/useAppStore';
import { useAlertStore } from '../../store/useAlertStore';
import { X, Calendar, Flag, AlignLeft, ListTodo, Plus, Hash, RotateCcw, Trash2, MoreHorizontal, CheckSquare, Type, MessageSquare, Copy, ArrowUpToLine, Archive, Play, History, Save, FileText, Printer, Lock, Link, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus, Paperclip, Workflow, Link2, Search, RefreshCw } from 'lucide-react';
import { Priority, Task, RepeatRule } from '../../types';
import { useState, useEffect, useRef, useMemo } from 'react';
import SubtaskItem from './SubtaskItem';
import DatePicker from '../Common/DatePicker';
import { useLists } from '../../hooks/useLists';
import { useQueryClient } from '@tanstack/react-query';
import { useClickOutside } from '../../hooks/useClickOutside';
import { getPriorityColor, getPriorityClass, getPriorityBgColor, getPriorityLabel, getPriorityTextClass } from '../../utils/priority';
import { formatTaskDateTime, isOverdue } from '../../utils/date';
import { isImeComposing } from '../../utils/keyboard';
import { generateId } from '../../utils/id';
import { copyToClipboard } from '../../utils/clipboard';
import { getRandomTagColor } from '../../constants/colors';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface TaskDetailProps {
  /** 只读模式（如日历视图）：仅展示任务内容，不允许编辑 */
  readOnly?: boolean;
}

export default function TaskDetail({ readOnly = false }: TaskDetailProps) {
  const { selectedTaskId, setSelectedTaskId, selectedListId } = useAppStore();
  
  // 拉伸宽度管理
  const minWidth = 350; // 最小宽度安全区
  const maxWidth = 800; // 最大宽度安全区
  // 给左侧导航、侧边栏和任务列表预留的最小空间，避免详情面板把列表挤没
  const RESERVED_FOR_LEFT = 560;

  const getMaxAllowedWidth = () =>
    Math.max(minWidth, Math.min(maxWidth, window.innerWidth - RESERVED_FOR_LEFT));

  const [width, setWidth] = useState(() => {
    // 详情面板会随任务选中/关闭反复挂载，这里记住上次拖拽的宽度
    const saved = Number(localStorage.getItem('taskDetailWidth'));
    const initial = saved > 0 ? saved : 400;
    return Math.min(initial, getMaxAllowedWidth());
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) {
      localStorage.setItem('taskDetailWidth', String(width));
    }
  }, [width, isResizing]);

  // 窗口变窄时自动收缩，保证左侧列表始终可用
  useEffect(() => {
    const handleWindowResize = () => {
      setWidth((prev) => Math.min(prev, getMaxAllowedWidth()));
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= minWidth && newWidth <= getMaxAllowedWidth()) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove('is-resizing');
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.classList.add('is-resizing');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const { showAlert } = useAlertStore();
  const queryClient = useQueryClient();
  const { data: task, isLoading } = useTask(selectedTaskId || '');
  const { data: subtasks } = useSubtasks(selectedTaskId || '');
  const { data: allTags } = useTags();
  const createTag = useCreateTag();
  const { data: allLists } = useLists();
  const createSubtask = useCreateSubtaskSimple();
  const createTask = useCreateTask();
  const updateTaskOrders = useUpdateTaskOrders();
  const updateTask = useUpdateTask();
  const undoDeleteTask = useUndoDeleteTask();
  const deleteTaskPermanently = useDeleteTaskPermanently();
  const deleteTask = useDeleteTask();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const isTrashView = selectedListId === 'smart_trash';
  /** 是否允许编辑：垃圾桶视图与只读模式（日历）下仅展示 */
  const canEdit = !readOnly && !isTrashView;

  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [tagSearchValue, setTagSearchValue] = useState('');
  const tagSearchInputRef = useRef<HTMLInputElement>(null);
  const [isPriorityPopoverOpen, setIsPriorityPopoverOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const tagPopoverRef = useRef<HTMLDivElement>(null);
  const tagTriggerRef = useRef<HTMLButtonElement>(null);
  const priorityPopoverRef = useRef<HTMLDivElement>(null);
  const priorityTriggerRef = useRef<HTMLButtonElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const dateTriggerRef = useRef<HTMLButtonElement>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState('');
  const originalTitleRef = useRef('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  // 标题输入法组合状态：组合输入期间不写缓存、不提交
  const isTitleComposingRef = useRef(false);

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState('');
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const isDescriptionComposingRef = useRef(false);

  const toggleTask = useToggleTask();

  const slashMenuItems = useMemo(() => [
    { icon: Heading1, label: '一级标题', section: 'text' },
    { icon: Heading2, label: '二级标题', section: 'text' },
    { icon: Heading3, label: '三级标题', section: 'text' },
    { icon: List, label: '无序列表', section: 'list' },
    { icon: ListOrdered, label: '有序列表', section: 'list' },
    { icon: CheckSquare, label: '检查项', section: 'list' },
    { icon: Quote, label: '引用', section: 'other' },
    { icon: Minus, label: '水平分割线', section: 'other' },
    { icon: Paperclip, label: '附件', section: 'action' },
    { icon: Workflow, label: '子任务', section: 'action' },
    { icon: Hash, label: '标签', section: 'action' },
    { icon: Link2, label: '关联任务/笔记', section: 'action' },
  ], []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task) {
      toggleTask.mutate(task.id);
    }
  };

  useEffect(() => {
    if (task && !isEditingTitle) {
      setEditTitleValue(task.title);
      // 如果标题为空（如新创建的任务），自动进入编辑模式并聚焦（只读模式除外）
      if (task.title === '' && canEdit) {
        setIsEditingTitle(true);
        originalTitleRef.current = '';
      }
    }
  }, [task?.id, task?.title, isTrashView, isEditingTitle, canEdit]);

  useEffect(() => {
    if (isEditingTitle) {
      // 使用 requestAnimationFrame 确保在 DOM 渲染后执行聚焦
      const timer = requestAnimationFrame(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
          titleInputRef.current.select();
        }
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [isEditingTitle]);

  const handleTitleStartEdit = () => {
    if (isTrashView) return;
    originalTitleRef.current = task?.title || '';
    setIsEditingTitle(true);
  };

  const handleTitleChange = (newTitle: string, syncCache = true) => {
    setEditTitleValue(newTitle);

    // 输入法组合输入期间不要把拼音等中间状态同步到列表，避免闪烁与状态错乱
    if (!syncCache) return;

    if (task) {
      // 实时更新本地缓存，实现列表和详情的同步
      const updatedTask = { ...task, title: newTitle };
      queryClient.setQueryData(['task', task.id], updatedTask);
      
      // 更新主列表缓存
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (oldData: Task[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(t => t.id === task.id ? updatedTask : t);
      });

      // 如果是子任务，更新父任务的子任务列表缓存
      if (task.parent_id) {
        queryClient.setQueryData(['subtasks', task.parent_id], (oldData: Task[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(t => t.id === task.id ? updatedTask : t);
        });
      }
    }
  };

  const handleTitleSave = (value?: string) => {
    const trimmedTitle = (value ?? editTitleValue).trim();
    if (task && trimmedTitle !== originalTitleRef.current) {
      console.log('TaskDetail saving title:', task.id, trimmedTitle, 'original:', originalTitleRef.current);
      updateTask.mutate({
        ...task,
        title: trimmedTitle || '无标题任务' // 防止保存空标题
      });
      // 保存后更新 originalTitleRef，防止重复保存或逻辑错误
      originalTitleRef.current = trimmedTitle || '无标题任务';
    }
    setIsEditingTitle(false);
  };

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuTriggerRef = useRef<HTMLButtonElement>(null);

  // 使用自定义 hook 处理点击外部关闭 Popover
  useClickOutside([tagPopoverRef, tagTriggerRef], () => setIsTagPopoverOpen(false), isTagPopoverOpen);
  useClickOutside([priorityPopoverRef, priorityTriggerRef], () => setIsPriorityPopoverOpen(false), isPriorityPopoverOpen);
  useClickOutside([datePickerRef, dateTriggerRef], () => setIsDatePickerOpen(false), isDatePickerOpen);
  useClickOutside([moreMenuRef, moreMenuTriggerRef], () => setIsMoreMenuOpen(false), isMoreMenuOpen);
  useClickOutside([slashMenuRef], () => setIsSlashMenuOpen(false), isSlashMenuOpen);

  useEffect(() => {
    if (task && !isEditingDescription) {
      setDescriptionValue(task.description || '');
    }
  }, [task?.description, isEditingDescription]);

useEffect(() => {
  if (isEditingDescription) {
    descriptionInputRef.current?.focus();
  }
}, [isEditingDescription]);

const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const newValue = e.target.value;
  setDescriptionValue(newValue);

  // 输入法组合输入期间不响应 "/" 指令，避免拼音里出现斜杠时误触发菜单
  if (isDescriptionComposingRef.current) return;

  // 检查是否输入了 /
  if (newValue.endsWith('/')) {
    setIsSlashMenuOpen(true);
  } else if (isSlashMenuOpen) {
    setIsSlashMenuOpen(false);
  }
};

const handleDescriptionBlur = () => {
    // 延迟关闭编辑模式，以便点击 Slash 菜单
    setTimeout(() => {
      // 如果 Slash 菜单还开着，不执行保存，因为菜单点击会处理
      if (isSlashMenuOpen) return;

      if (task && descriptionValue !== (task.description || '')) {
        updateTask.mutate({
          ...task,
          description: descriptionValue
        });
      }
      setIsEditingDescription(false);
    }, 200);
  };

  const handleSlashItemClick = (label: string) => {
    // 1. 立即停止冒泡，防止触发其他事件
    // 注意：这里没有 event 对象，因为是 button 的 onClick
    
    // 2. 计算并更新描述（移除最后的 /）
    let newDesc = descriptionValue;
    if (descriptionValue.endsWith('/')) {
      newDesc = descriptionValue.slice(0, -1);
      setDescriptionValue(newDesc);
      
      // 3. 立即触发一次保存到数据库，确保状态同步
      if (task) {
        updateTask.mutate({
          ...task,
          description: newDesc
        });
      }
    }

    // 4. 处理具体功能
    if (label === '标签') {
      setIsTagPopoverOpen(true);
    }
    
    // 5. 关闭菜单并强制回焦
    setIsSlashMenuOpen(false);
    setTimeout(() => {
      descriptionInputRef.current?.focus();
    }, 0);
  };

// 本地子任务状态，用于流畅的拖放响应
  const [localSubtasks, setLocalSubtasks] = useState<Task[]>([]);

  useEffect(() => {
    if (subtasks) {
      // 过滤掉已删除的子任务
      const filteredSubtasks = subtasks.filter(t => !t.is_deleted);
      setLocalSubtasks(filteredSubtasks);
    } else {
      // 切换任务或数据未就绪时清空，避免残留上一个任务的子任务
      setLocalSubtasks([]);
    }
  }, [subtasks, selectedTaskId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localSubtasks.findIndex((t) => t.id === active.id);
    const newIndex = localSubtasks.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newSubtasks = arrayMove(localSubtasks, oldIndex, newIndex);
    setLocalSubtasks(newSubtasks);

    const ascendingOrders: [string, number][] = newSubtasks.map((t, index) => [
      t.id,
      index * 10,
    ]);

    updateTaskOrders.mutate(ascendingOrders);
  };

  const handleAddSubtask = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newSubtaskTitle.trim() && task) {
      createSubtask.mutate({
        title: newSubtaskTitle.trim(),
        parentId: task.id,
        listId: task.list_id,
      });
      setNewSubtaskTitle('');
      // 保持焦点，方便连续添加子任务
      subtaskInputRef.current?.focus();
    }
  };

  const filteredTags = useMemo(() => {
    if (!allTags) return [];
    const search = tagSearchValue.toLowerCase().trim();
    return allTags.filter(tag => 
      !task?.tags?.includes(tag.id) && 
      tag.name.toLowerCase().includes(search)
    );
  }, [allTags, task?.tags, tagSearchValue]);

  const showCreateOption = useMemo(() => {
    const search = tagSearchValue.trim();
    if (!search) return false;
    return !allTags?.some(tag => tag.name.toLowerCase() === search.toLowerCase());
  }, [allTags, tagSearchValue]);

  const handleCreateAndAddTag = async () => {
    const name = tagSearchValue.trim();
    if (!name || !task) return;

    try {
      const newTag = await createTag.mutateAsync({ name, color: getRandomTagColor() });
      if (newTag) {
        handleToggleTag(newTag.id);
        setTagSearchValue('');
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  useEffect(() => {
    if (isTagPopoverOpen) {
      setTagSearchValue('');
      // 延迟聚焦，确保 DOM 已渲染
      setTimeout(() => tagSearchInputRef.current?.focus(), 50);
    }
  }, [isTagPopoverOpen]);

  const handleToggleTag = (tagId: string) => {
    if (!task) return;
    const currentTags = task.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];

    updateTask.mutate({
      ...task,
      tags: newTags
    });
    // 选择标签后自动关闭弹窗
    setIsTagPopoverOpen(false);
  };

  const handlePriorityChange = (priority: Priority) => {
    if (!task) return;
    updateTask.mutate({ ...task, priority });
    setIsPriorityPopoverOpen(false);
  };

  const handleDateChange = (timestamp: number | undefined, reminder?: string, repeat_rule?: RepeatRule | null) => {
    if (task) {
      updateTask.mutate({
        ...task,
        due_date: timestamp || null,
        reminder: reminder || 'none',
        repeat_rule: repeat_rule || null,
      });
    }
    setIsDatePickerOpen(false);
  };

  const handleDelete = () => {
    if (task) {
      deleteTask.mutate(task.id);
      setSelectedTaskId(null);
    }
  };

  const handleRestore = () => {
    if (task) {
      undoDeleteTask.mutate(task.id);
      setSelectedTaskId(null);
    }
  };

  // 置顶：把排序值调到同级任务最小值之前
  const handlePin = () => {
    if (!task) return;
    const cachedTasks = queryClient
      .getQueriesData<Task[]>({ queryKey: ['tasks'] })
      .flatMap(([, data]) => data ?? []);

    const siblings = cachedTasks.filter(
      (t) =>
        !t.is_deleted &&
        t.list_id === task.list_id &&
        (t.parent_id ?? null) === (task.parent_id ?? null)
    );

    const minOrder = siblings.length > 0
      ? Math.min(...siblings.map((t) => t.order ?? 0))
      : 0;

    updateTask.mutate({ ...task, order: minOrder - 10 });
  };

  // 创建副本
  const handleDuplicate = () => {
    if (!task) return;
    const now = Math.floor(Date.now() / 1000);
    createTask.mutate({
      ...task,
      id: generateId(),
      completed: false,
      completed_at: null,
      is_deleted: false,
      order: (task.order ?? 0) + 1,
      created_at: now,
      updated_at: now,
    }, {
      onSuccess: (newTask) => setSelectedTaskId(newTask.id),
    });
  };

  // 复制任务链接
  const handleCopyLink = async () => {
    if (!task) return;
    await copyToClipboard(`dida://task/${task.id}`);
  };

  const handleDeletePermanently = () => {
    if (task) {
      showAlert({
        title: '永久删除任务',
        message: '确定要永久删除这个任务吗？此操作不可撤销。',
        type: 'error',
        confirmLabel: '删除',
        onConfirm: () => {
          deleteTaskPermanently.mutate(task.id);
          setSelectedTaskId(null);
        }
      });
    }
  };

  // 未选中任务时不占用任何空间（详情面板默认隐藏，点击任务才弹出）
  if (!selectedTaskId) {
    return null;
  }

  if (isLoading) {
    return (
      <div 
        style={{ width: `${width}px` }}
        className="border-l border-[var(--dida-border-light)] bg-[var(--dida-surface)] flex items-center justify-center relative flex-shrink-0 h-full"
      >
        {/* 左侧拉伸条 */}
        <div
          onMouseDown={() => setIsResizing(true)}
          className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400/30 transition-colors z-50"
        />
        <div className="text-[var(--dida-text-secondary)]">加载中...</div>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div 
      style={{ width: `${width}px` }}
      className="border-l border-[var(--dida-border-light)] bg-[var(--dida-surface)] flex flex-col relative flex-shrink-0 select-none h-full"
    >
      {/* 左侧拉伸条 */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400/30 transition-colors z-50"
      />
      {/* 头部 */}
      <div className="flex items-center justify-between p-2 border-b border-[var(--dida-border-light)] h-12">
        <div className="flex items-center gap-2">
          {/* 滴答清单风格 Checkbox */}
          <div className="flex-shrink-0 flex items-center justify-center pl-1">
            <div
              onClick={readOnly ? undefined : handleToggle}
              className={`dida-checkbox ${getPriorityClass(task.priority)} ${task.completed ? 'completed' : ''} ${readOnly ? 'cursor-default' : ''}`}
              style={{
                borderColor: getPriorityColor(task.priority),
                backgroundColor: getPriorityBgColor(task.priority, !!task.completed),
                width: '18px',
                height: '18px',
              }}
            />
          </div>

          {/* 日期选择器 */}
          <div className="relative">
            <button
              ref={dateTriggerRef}
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (!readOnly) setIsDatePickerOpen(!isDatePickerOpen);
              }}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${readOnly ? 'cursor-default' : 'hover:bg-[var(--dida-bg-hover)] cursor-pointer'}`}
            >
              {(() => {
                const overdue = !task.completed && isOverdue(task.due_date);
                const iconColor = overdue ? 'text-[var(--priority-high)]' : (task.due_date ? 'text-[var(--dida-primary)]' : 'text-[var(--dida-text-tertiary)]');
                const textColor = overdue ? 'text-[var(--priority-high)]' : (task.due_date ? 'text-[var(--dida-text-main)]' : 'text-[var(--dida-text-tertiary)]');
                
                return (
                  <>
                    <Calendar className={`w-4 h-4 ${iconColor}`} />
                    <span className={`text-[13px] font-medium ${textColor}`}>
                      {task.due_date ? formatTaskDateTime(task.due_date) : '日期'}
                    </span>
                    {task.repeat_rule && (
                      <RefreshCw className={`w-3 h-3 ml-0.5 ${iconColor}`} />
                    )}
                  </>
                );
              })()}
            </button>
            {isDatePickerOpen && (
              <div ref={datePickerRef} className="absolute top-full left-0 mt-1 z-[1000]">
                <DatePicker
                  selectedDate={task.due_date || undefined}
                  reminder={task.reminder || 'none'}
                  repeat_rule={task.repeat_rule}
                  onSelect={handleDateChange}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* 优先级 */}
          <div className="relative">
            <button
              ref={priorityTriggerRef}
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (!readOnly) setIsPriorityPopoverOpen(!isPriorityPopoverOpen);
              }}
              className={`p-1.5 rounded-md transition-colors ${readOnly ? 'cursor-default' : 'hover:bg-[var(--dida-bg-hover)]'}`}
              title={readOnly ? '优先级' : '设置优先级'}
            >
              <Flag className={`w-4 h-4 ${getPriorityTextClass(task.priority)} ${task.priority !== Priority.None ? 'fill-current' : ''}`} />
            </button>
            {isPriorityPopoverOpen && (
              <div
                ref={priorityPopoverRef}
                className="absolute top-full right-0 mt-1 w-32 bg-[var(--dida-elevated)] border border-[var(--dida-border-light)] shadow-xl rounded-lg p-1 z-[1000]"
              >
                {[Priority.High, Priority.Medium, Priority.Low, Priority.None].map((p) => (
                  <div
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--dida-bg-hover)] rounded-md cursor-pointer transition-colors"
                  >
                    <Flag className={`w-3.5 h-3.5 ${getPriorityTextClass(p)} ${task.priority === p ? 'fill-current' : ''}`} />
                    <span className="text-[12px] text-[var(--dida-text-main)]">{getPriorityLabel(p)}优先级</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!readOnly && (
          <div className="relative">
            <button 
              ref={moreMenuTriggerRef}
              type="button"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`p-1.5 hover:bg-[var(--dida-bg-hover)] rounded-md transition-colors ${isMoreMenuOpen ? 'bg-[var(--dida-bg-hover)] text-[var(--dida-text-secondary)]' : ''}`}
              title="更多"
            >
              <MoreHorizontal className={`w-4 h-4 ${isMoreMenuOpen ? 'text-[var(--dida-text-secondary)]' : 'text-[var(--dida-text-tertiary)]'}`} />
            </button>

            {/* 更多操作菜单 */}
            {isMoreMenuOpen && (
              <div
                ref={moreMenuRef}
                className="absolute top-full right-0 mt-1 w-56 bg-[var(--dida-elevated)] border border-[var(--dida-border-light)] shadow-xl rounded-xl py-1.5 z-[1000] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div className="px-1.5 space-y-0.5">
                  <MoreMenuItem
                    icon={<Plus className="w-4 h-4" />}
                    label="添加子任务"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      subtaskInputRef.current?.focus();
                    }}
                  />
                  <MoreMenuItem icon={<Link2 className="w-4 h-4" />} label="关联主任务" disabled />
                  <MoreMenuItem
                    icon={<ArrowUpToLine className="w-4 h-4" />}
                    label="置顶"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handlePin();
                    }}
                  />
                  <MoreMenuItem icon={<Archive className="w-4 h-4" />} label="放弃" disabled />
                  <MoreMenuItem
                    icon={<Hash className="w-4 h-4" />}
                    label="标签"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsTagPopoverOpen(true);
                    }}
                  />
                  <MoreMenuItem icon={<Paperclip className="w-4 h-4" />} label="上传附件" disabled />

                  <div className="h-[1px] bg-[var(--dida-bg-hover)] my-1 mx-2" />

                  <MoreMenuItem icon={<Play className="w-4 h-4" />} label="开始专注" disabled />

                  <div className="h-[1px] bg-[var(--dida-bg-hover)] my-1 mx-2" />

                  <MoreMenuItem icon={<History className="w-4 h-4" />} label="任务动态" disabled />
                  <MoreMenuItem icon={<Save className="w-4 h-4" />} label="保存为模板" disabled />
                  <MoreMenuItem
                    icon={<Copy className="w-4 h-4" />}
                    label="创建副本"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleDuplicate();
                    }}
                  />
                  <MoreMenuItem
                    icon={<Link className="w-4 h-4" />}
                    label="复制链接"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleCopyLink();
                    }}
                  />
                  <MoreMenuItem icon={<FileText className="w-4 h-4" />} label="转换为笔记" disabled />
                  <MoreMenuItem icon={<Printer className="w-4 h-4" />} label="打印" disabled />

                  <div className="h-[1px] bg-[var(--dida-bg-hover)] my-1 mx-2" />

                  <MoreMenuItem
                    icon={<Trash2 className="w-4 h-4" />}
                    label="删除"
                    danger
                    onClick={() => {
                      handleDelete();
                      setIsMoreMenuOpen(false);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          )}
          
          {readOnly && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 mr-1 text-[11px] text-[var(--dida-text-tertiary)] bg-[var(--dida-bg-hover)] rounded"
              title="日历视图下任务详情为只读模式"
            >
              <Lock className="w-3 h-3" />
              只读
            </span>
          )}

          <button
            onClick={() => setSelectedTaskId(null)}
            type="button"
            className="p-1.5 hover:bg-[var(--dida-bg-hover)] rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-[var(--dida-text-tertiary)]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* 标题 */}
        <div className="space-y-3">
          <div className="flex-1 min-w-0">
            {isEditingTitle && canEdit ? (
              <input
                ref={titleInputRef}
                type="text"
                value={editTitleValue}
                onChange={(e) => handleTitleChange(e.target.value, !isTitleComposingRef.current)}
                onCompositionStart={() => {
                  isTitleComposingRef.current = true;
                }}
                onCompositionEnd={(e) => {
                  isTitleComposingRef.current = false;
                  handleTitleChange(e.currentTarget.value);
                }}
                onBlur={(e) => handleTitleSave(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isImeComposing(e)) handleTitleSave();
                }}
                className="w-full text-[18px] font-bold text-[var(--dida-text-main)] leading-snug outline-none bg-transparent"
              />
            ) : (
              <h3
                onClick={canEdit ? handleTitleStartEdit : undefined}
                className={`text-[18px] font-bold text-[var(--dida-text-main)] leading-snug break-words ${canEdit
                  ? 'cursor-text hover:bg-[var(--dida-bg-hover)] -mx-1 px-1 rounded transition-colors'
                  : 'cursor-default'
                  } ${task.completed || isTrashView ? 'text-[var(--dida-text-tertiary)]' : ''}`}
                title={canEdit ? '点击修改标题' : ''}
              >
                {task.title || (isEditingTitle && canEdit ? '' : '无标题任务')}
              </h3>
            )}
          </div>
        </div>

        {/* 垃圾桶视图下的操作按钮（只读模式下不提供恢复/删除） */}
        {isTrashView && !readOnly && (
          <div className="flex gap-2">
            <button
              onClick={handleRestore}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-[var(--dida-primary)] text-white rounded-md hover:bg-[#40a9ff] transition-colors text-[13px] font-medium shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              恢复任务
            </button>
            <button
              onClick={handleDeletePermanently}
              className="flex-1 flex items-center justify-center gap-2 py-2 border border-red-200 text-red-500 rounded-md hover:bg-red-50 transition-colors text-[13px] font-medium"
            >
              <Trash2 className="w-4 h-4" />
              永久删除
            </button>
          </div>
        )}

        {/* 描述区域 */}
        <div className="space-y-2 relative">
          <div className="flex items-center gap-2 text-[12px] font-bold text-[var(--dida-text-tertiary)] uppercase tracking-tighter">
            <AlignLeft className="w-3.5 h-3.5" />
            <span>描述</span>
          </div>
          <div 
            className={`min-h-[60px] p-2 -mx-2 rounded-md transition-colors group ${canEdit ? 'hover:bg-[var(--dida-bg-hover)] cursor-text' : 'cursor-default'} ${isEditingDescription ? 'bg-[var(--dida-elevated)]' : ''}`}
            onClick={() => {
              if (canEdit) setIsEditingDescription(true);
            }}
          >
            {isEditingDescription && canEdit ? (
              <textarea
                ref={descriptionInputRef}
                value={descriptionValue}
                onChange={handleDescriptionChange}
                onCompositionStart={() => {
                  isDescriptionComposingRef.current = true;
                }}
                onCompositionEnd={() => {
                  isDescriptionComposingRef.current = false;
                }}
                onBlur={handleDescriptionBlur}
                placeholder="输入内容或使用 / 快速插入"
                className="w-full min-h-[100px] bg-transparent outline-none text-[13px] text-[var(--dida-text-main)] leading-relaxed resize-none placeholder:text-[var(--dida-text-tertiary)]"
              />
            ) : task.description ? (
              <p className="text-[13px] text-[var(--dida-text-main)] leading-relaxed whitespace-pre-wrap">{task.description}</p>
            ) : (
              <p className="text-[13px] text-[var(--dida-text-tertiary)] italic">
                {readOnly ? '暂无描述' : '点此添加详细描述...'}
              </p>
            )}
          </div>

          {/* Slash Context Menu */}
          {isSlashMenuOpen && (
            <div 
              ref={slashMenuRef}
              className="absolute left-0 top-full mt-1 w-48 bg-[var(--dida-elevated)] border border-[var(--dida-border-light)] shadow-2xl rounded-xl py-1.5 z-[60] animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="overflow-y-auto custom-scrollbar">
                {slashMenuItems.map((item, index) => {
                  const showDivider = index > 0 && slashMenuItems[index-1].section !== item.section;
                  return (
                    <div key={item.label}>
                      {showDivider && <div className="h-[1px] bg-[var(--dida-bg-hover)] my-1 mx-2" />}
                      <button
                        onClick={() => handleSlashItemClick(item.label)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[var(--dida-bg-hover)] transition-colors text-left group"
                      >
                        <div className="w-6 h-6 flex items-center justify-center rounded-md bg-[var(--dida-bg-hover)] group-hover:bg-[var(--dida-elevated)] border border-transparent group-hover:border-[var(--dida-border-light)] transition-all">
                          <item.icon className="w-3.5 h-3.5 text-[var(--dida-text-secondary)] group-hover:text-[var(--dida-primary)]" />
                        </div>
                        <span className="text-[12px] text-[var(--dida-text-secondary)] group-hover:text-[var(--dida-text-main)]">{item.label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 标签展示区 - 移动到描述下方 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[12px] font-bold text-[var(--dida-text-tertiary)] uppercase tracking-tighter">
            <Hash className="w-3.5 h-3.5" />
            <span>标签</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 relative">
            {Array.isArray(task.tags) && task.tags
              .map(tagId => ({ tagId, tagInfo: (allTags || []).find(t => t.id === tagId) }))
              .filter(item => item.tagInfo)
              .map(({ tagId, tagInfo }) => {
                return (
                  <span
                    key={tagId}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium group cursor-default transition-colors"
                    style={{ 
                      color: tagInfo!.color, 
                      backgroundColor: `${tagInfo!.color}15`,
                      border: `1px solid ${tagInfo!.color}20`
                    }}
                  >
                    <Hash className="w-3 h-3 mr-0.5 opacity-70" style={{ color: tagInfo!.color }} />
                    {tagInfo!.name}
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTag(tagId);
                        }}
                        className="ml-1 hover:opacity-100 opacity-40 transition-opacity"
                        style={{ color: tagInfo!.color }}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </span>
                );
              })}
            {canEdit && (
              <>
                <button
                  ref={tagTriggerRef}
                  onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
                  className="inline-flex items-center px-1.5 py-0.5 text-[var(--dida-text-tertiary)] hover:text-[var(--dida-primary)] hover:bg-blue-50 rounded transition-colors"
                  title="添加标签"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                {/* 标签简易选择器 Popover - 移动到按钮旁边 */}
                {isTagPopoverOpen && (
                  <div
                    ref={tagPopoverRef}
                    className="absolute bottom-full left-0 mb-2 w-56 bg-[var(--dida-elevated)] border border-[var(--dida-border-light)] shadow-xl rounded-lg p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--dida-text-tertiary)]" />
                      <input
                        ref={tagSearchInputRef}
                        type="text"
                        value={tagSearchValue}
                        onChange={(e) => setTagSearchValue(e.target.value)}
                        placeholder="快速搜索或创建标签"
                        className="w-full pl-7 pr-2 py-1.5 bg-[var(--dida-bg-hover)] border-none rounded-md text-[13px] outline-none placeholder:text-[var(--dida-text-tertiary)] focus:bg-[var(--dida-bg-hover)] transition-colors"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isImeComposing(e) && showCreateOption) {
                            handleCreateAndAddTag();
                          }
                        }}
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {filteredTags.map(tag => (
                        <div
                          key={tag.id}
                          onClick={() => handleToggleTag(tag.id)}
                          className="flex items-center justify-between px-2 py-1.5 hover:bg-[#F0F7FF] rounded-md cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#CBD5E0' }} />
                            <span className="text-[13px] text-[var(--dida-text-main)]">{tag.name}</span>
                          </div>
                        </div>
                      ))}

                      {showCreateOption && (
                        <div
                          onClick={handleCreateAndAddTag}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#F0F7FF] rounded-md cursor-pointer transition-colors text-[var(--dida-primary)]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="text-[13px]">创建标签 "{tagSearchValue}"</span>
                        </div>
                      )}

                      {filteredTags.length === 0 && !showCreateOption && (
                        <div className="px-2 py-4 text-center text-xs text-[var(--dida-text-tertiary)] italic">
                          {tagSearchValue ? '未找到相关标签' : '暂无可用标签'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 分割线 */}
        <div className="h-[1px] bg-[var(--dida-bg-hover)] -mx-6" />

        {/* 子任务区域 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[12px] font-bold text-[var(--dida-text-tertiary)] uppercase tracking-tighter">
            <ListTodo className="w-3.5 h-3.5" />
            <span>子任务 {localSubtasks.length ? `(${localSubtasks.length})` : ''}</span>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext items={localSubtasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-0.5">
                {localSubtasks.map((subtask) => (
                  <SubtaskItem key={subtask.id} subtask={subtask} readOnly={readOnly} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {canEdit && (
            <form
              onSubmit={handleAddSubtask}
              className="flex items-center gap-2 py-1 px-2 group cursor-text rounded-md focus-within:bg-[var(--dida-bg-hover)]/60 transition-colors"
              onClick={() => subtaskInputRef.current?.focus()}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // 有内容则直接提交，没有内容则聚焦输入框
                  if (newSubtaskTitle.trim()) {
                    handleAddSubtask();
                  } else {
                    subtaskInputRef.current?.focus();
                  }
                }}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors text-[var(--dida-text-tertiary)] hover:text-[var(--dida-primary)] hover:bg-[var(--dida-bg-hover)]"
                title="添加子任务"
              >
                <Plus className="w-4 h-4" />
              </button>
              <input
                ref={subtaskInputRef}
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  // 输入法组合输入时，回车用于确认候选词，不提交
                  if (e.key === 'Enter' && isImeComposing(e)) {
                    e.preventDefault();
                  }
                }}
                placeholder="添加子任务..."
                className="flex-1 bg-transparent outline-none text-[13px] text-[var(--dida-text-main)] placeholder:text-[var(--dida-text-tertiary)]"
              />
              {newSubtaskTitle.trim() && (
                <button
                  type="submit"
                  className="px-2 py-0.5 text-[12px] font-medium text-white bg-[var(--dida-primary)] hover:opacity-90 rounded transition-opacity"
                >
                  添加
                </button>
              )}
            </form>
          )}
        </div>
      </div>

      {/* 底部工具栏 */}
      <div className="flex items-center justify-between p-3 border-t border-[var(--dida-border-light)] bg-[var(--dida-elevated)] h-12 relative">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {/* 所属清单（只读展示，移动清单请使用右键菜单） */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded max-w-[150px]"
            title="所属清单"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-[13px] text-[var(--dida-text-secondary)] truncate">
              {allLists?.find(l => l.id === task.list_id)?.name || '收集箱'}
            </span>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              className="p-1.5 rounded-md opacity-45 cursor-not-allowed"
              title="排版（功能开发中）"
            >
              <Type className="w-4 h-4 text-[var(--dida-text-tertiary)]" />
            </button>
            <button
              type="button"
              disabled
              className="p-1.5 rounded-md opacity-45 cursor-not-allowed relative"
              title="评论（功能开发中）"
            >
              <MessageSquare className="w-4 h-4 text-[var(--dida-text-tertiary)]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface MoreMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  /** 置灰占位：功能尚未实现 */
  disabled?: boolean;
}

function MoreMenuItem({ icon, label, onClick, danger, disabled }: MoreMenuItemProps) {
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      title={disabled ? '功能开发中，敬请期待' : undefined}
      onClick={() => {
        if (disabled) return;
        onClick?.();
      }}
      className={`w-full flex items-center gap-3 px-3 py-1.5 text-[13px] rounded-md transition-colors ${
        disabled
          ? 'text-[var(--dida-text-tertiary)] opacity-45 cursor-not-allowed'
          : danger
            ? 'text-red-500 hover:bg-red-50'
            : 'text-[var(--dida-text-secondary)] hover:bg-[var(--dida-bg-hover)]'
      }`}
    >
      <span className={danger && !disabled ? 'text-red-500' : 'text-[var(--dida-text-tertiary)]'}>
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {disabled && <span className="text-[10px] text-[var(--dida-text-tertiary)]">待开发</span>}
    </button>
  );
}
