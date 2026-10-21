# UI Components

**Scope:** `src/components/` - React component library

## OVERVIEW

Feature-based component organization for task management UI.

## STRUCTURE

```
components/
├── Task/           # Task-related (largest)
│   ├── TaskList.tsx
│   ├── TaskItem.tsx
│   ├── TaskDetail.tsx
│   ├── TaskContextMenu.tsx
│   └── ...
├── Layout/         # Structural components
│   ├── MainLayout.tsx
│   ├── Sidebar.tsx
│   └── Header.tsx
├── Calendar/       # 月历视图
├── List/           # 清单右键菜单（重命名 / 图标 / 颜色 / 删除）
├── Search/         # 搜索视图与结果项
├── Common/         # Reusable primitives
│   ├── DatePicker.tsx
│   ├── AlertDialog.tsx
│   ├── SettingsModal.tsx
│   └── ...
└── Tag/            # Tag management
    ├── AddTagModal.tsx
    └── TagContextMenu.tsx
```

## WHERE TO LOOK

| Add This | Go Here | Create New |
|----------|---------|------------|
| Task feature | `Task/` | Yes |
| Layout change | `Layout/` | No |
| Reusable UI | `Common/` | Maybe (check existing first) |
| Tag feature | `Tag/` | Yes |
| List (清单) UI | `List/` | Yes |
| Search UI | `Search/` | Yes |
| Calendar UI | `Calendar/` | Yes |

## CONVENTIONS

### Component Naming
- PascalCase filenames matching component name
- One component per file (no multi-export files)
- Feature folders group related components

### Props Interface
```tsx
interface TaskItemProps {
  task: Task
  onComplete: (id: string) => void
  onDelete: (id: string) => void
}

export function TaskItem({ task, onComplete, onDelete }: TaskItemProps) {
  // ...
}
```

### Context Menus
Extracted as separate components per entity:
- `TaskContextMenu.tsx`
- `TagContextMenu.tsx`
- Reusable pattern - follow this for new entities

## ANTI-PATTERNS

- **NO** inline `invoke()` calls - use hooks from `src/hooks/`
- **NO** business logic in components - extract to hooks/utils
- **AVOID** deeply nested component trees - compose at usage site
- **NO** CSS modules or styled-components - Tailwind only

## STYLING

- Tailwind utility classes for all styling
- Global styles: `src/index.css`
- Custom colors: `constants/colors.ts` → `tailwind.config.js` primary palette

## NOTES

### Component Size
- Keep components <200 lines
- Extract complex logic to hooks
- Extract repetitive UI to `Common/`
