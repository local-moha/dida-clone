export interface ShortcutItem {
  keys: string[];
  description: string;
}

const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  ? '⌘'
  : 'Ctrl';

export const MOD_KEY = MOD;

export const SHORTCUTS: ShortcutItem[] = [
  { keys: ['N'], description: '新建任务（聚焦快速添加框）' },
  { keys: [MOD, 'F'], description: '搜索任务' },
  { keys: [MOD, 'B'], description: '显示 / 隐藏侧边栏' },
  { keys: [MOD, ','], description: '打开设置' },
  { keys: ['E'], description: '关闭任务详情面板' },
  { keys: ['Esc'], description: '关闭详情 / 退出输入' },
];
