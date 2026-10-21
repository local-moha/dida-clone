import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Search, Trash2, X } from 'lucide-react';
import { Task } from '../../types';
import { useTasks } from '../../hooks/useTasks';
import { useLists } from '../../hooks/useLists';
import { useTags } from '../../hooks/useTags';
import { SMART_LIST_IDS } from '../../constants/smartLists';
import { buildTaskSearchIndex } from '../../utils/search';
import { useAppStore } from '../../store/useAppStore';
import SearchResultItem from './SearchResultItem';

type SearchScope = 'all' | 'active' | 'completed';

const SCOPE_OPTIONS: { key: SearchScope; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '未完成' },
  { key: 'completed', label: '已完成' },
];

interface SectionProps {
  title: string;
  tasks: Task[];
  keyword: string;
  getListName: (listId: string) => string;
  getTags: (task: Task) => { id: string; name: string; color: string }[];
}

function ResultSection({ title, tasks, keyword, getListName, getTags }: SectionProps) {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-2">
      <div className="px-4 py-2 text-[12px] font-bold text-[var(--dida-text-tertiary)]">
        {title} ({tasks.length})
      </div>
      {tasks.map((task) => (
        <SearchResultItem
          key={task.id}
          task={task}
          keyword={keyword}
          listName={getListName(task.list_id)}
          tags={getTags(task)}
        />
      ))}
    </div>
  );
}

export default function SearchView() {
  const setViewMode = useAppStore((s) => s.setViewMode);
  const keyword = useAppStore((s) => s.searchQuery);
  const setKeyword = useAppStore((s) => s.setSearchQuery);

  const [scope, setScope] = useState<SearchScope>('all');
  const [includeTrash, setIncludeTrash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: tasks, isLoading } = useTasks();
  const { data: trashTasks } = useTasks(SMART_LIST_IDS.TRASH, undefined, includeTrash);
  const { data: lists } = useLists();
  const { data: allTags } = useTags();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getListName = (listId: string) =>
    lists?.find((l) => l.id === listId)?.name ?? '未知清单';

  const getTags = (task: Task) =>
    task.tags
      .map((id) => allTags?.find((t) => t.id === id))
      .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
      .map((tag) => ({ id: tag.id, name: tag.name, color: tag.color }));

  const results = useMemo(() => {
    const source = [...(tasks ?? []), ...(includeTrash ? trashTasks ?? [] : [])];
    const key = keyword.trim().toLowerCase();
    if (!key) return { active: [], completed: [], trashed: [] };

    return source.reduce<{ active: Task[]; completed: Task[]; trashed: Task[] }>(
      (acc, task) => {
        if (scope === 'active' && task.completed) return acc;
        if (scope === 'completed' && !task.completed) return acc;

        const index = buildTaskSearchIndex(
          task,
          getListName(task.list_id),
          getTags(task).map((t) => t.name)
        );
        if (!index.includes(key)) return acc;

        if (task.is_deleted) acc.trashed.push(task);
        else if (task.completed) acc.completed.push(task);
        else acc.active.push(task);
        return acc;
      },
      { active: [], completed: [], trashed: [] }
    );
  }, [tasks, trashTasks, keyword, scope, includeTrash, lists, allTags]);

  const total = results.active.length + results.completed.length + results.trashed.length;
  const hasKeyword = keyword.trim().length > 0;

  return (
    <div className="h-full flex flex-col bg-[var(--dida-surface)] select-none">
      {/* 顶部搜索区 */}
      <div className="px-6 py-4 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setViewMode('tasks')}
            className="p-1.5 hover:bg-[var(--dida-bg-hover)] rounded-md transition-colors text-[var(--dida-text-tertiary)] hover:text-[var(--dida-text-main)]"
            title="返回任务视图"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-[var(--dida-text-main)]">搜索</h1>
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-2 bg-[var(--dida-bg-input)] border-2 border-transparent focus-within:border-[var(--dida-primary)]/40 focus-within:bg-[var(--dida-elevated)] rounded-xl transition-all`}
        >
          <Search className="w-5 h-5 text-[var(--dida-text-tertiary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索任务标题、备注、清单或标签..."
            className="flex-1 bg-transparent h-8 text-[14px] text-[var(--dida-text-main)] outline-none placeholder:text-[var(--dida-text-tertiary)]"
          />
          {hasKeyword && (
            <button
              onClick={() => {
                setKeyword('');
                inputRef.current?.focus();
              }}
              className="p-1 hover:bg-[var(--dida-bg-hover)] rounded transition-colors text-[var(--dida-text-tertiary)]"
              title="清空"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {SCOPE_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => setScope(option.key)}
              className={`px-3 py-1 text-[12px] rounded-full transition-colors ${
                scope === option.key
                  ? 'bg-[var(--dida-primary-light)] text-[var(--dida-primary)] font-medium'
                  : 'text-[var(--dida-text-secondary)] hover:bg-[var(--dida-bg-hover)]'
              }`}
            >
              {option.label}
            </button>
          ))}

          <div className="w-px h-4 bg-[var(--dida-border-light)] mx-1" />

          <button
            onClick={() => setIncludeTrash((prev) => !prev)}
            className={`flex items-center gap-1 px-3 py-1 text-[12px] rounded-full transition-colors ${
              includeTrash
                ? 'bg-[var(--dida-bg-hover)] text-[var(--dida-text-main)] font-medium'
                : 'text-[var(--dida-text-secondary)] hover:bg-[var(--dida-bg-hover)]'
            }`}
            title="是否同时搜索垃圾桶中的任务"
          >
            <Trash2 className="w-3.5 h-3.5" />
            包含垃圾桶
          </button>

          {hasKeyword && (
            <span className="text-[12px] text-[var(--dida-text-tertiary)] ml-auto">
              共 {total} 个结果
            </span>
          )}
        </div>
      </div>

      {/* 结果列表 */}
      <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
        {!hasKeyword && (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--dida-text-tertiary)]">
            <Search className="w-10 h-10 mb-4 opacity-40" />
            <div className="text-[13px]">输入关键词开始搜索</div>
            <div className="text-[12px] mt-1 opacity-70">支持匹配标题、备注、所属清单与标签</div>
          </div>
        )}

        {hasKeyword && isLoading && (
          <div className="py-10 text-center text-[13px] text-[var(--dida-text-tertiary)]">搜索中...</div>
        )}

        {hasKeyword && !isLoading && total === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--dida-text-tertiary)]">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-[13px]">没有找到匹配的任务</div>
          </div>
        )}

        {hasKeyword && total > 0 && (
          <div className="pb-10">
            <ResultSection
              title="未完成"
              tasks={results.active}
              keyword={keyword}
              getListName={getListName}
              getTags={getTags}
            />
            <ResultSection
              title="已完成"
              tasks={results.completed}
              keyword={keyword}
              getListName={getListName}
              getTags={getTags}
            />
            <ResultSection
              title="垃圾桶"
              tasks={results.trashed}
              keyword={keyword}
              getListName={getListName}
              getTags={getTags}
            />
          </div>
        )}
      </div>
    </div>
  );
}
