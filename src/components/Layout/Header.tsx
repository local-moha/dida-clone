import { Search, Settings } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-14 border-b border-[var(--dida-border-light)] bg-[var(--dida-elevated)] flex items-center px-4 gap-4">
      <div className="flex-1 flex items-center gap-2">
        <Search className="w-5 h-5 text-[var(--dida-text-tertiary)]" />
        <input
          type="text"
          placeholder="搜索任务..."
          className="flex-1 outline-none text-sm"
        />
      </div>
      <button className="p-2 hover:bg-[var(--dida-bg-hover)] rounded-lg transition-colors">
        <Settings className="w-5 h-5 text-[var(--dida-text-secondary)]" />
      </button>
    </header>
  );
}
