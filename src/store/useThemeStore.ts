import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'dida-theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const readStoredMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
};

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(DARK_QUERY).matches
    : false;

export const resolveTheme = (mode: ThemeMode): ResolvedTheme =>
  mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode;

const applyResolvedTheme = (resolved: ResolvedTheme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
};

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: readStoredMode(),
  resolved: resolveTheme(readStoredMode()),

  setMode: (mode) => {
    const resolved = resolveTheme(mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
    applyResolvedTheme(resolved);
    set({ mode, resolved });
  },

  toggle: () => {
    // 在「跟随系统」时切换，先落到与当前系统相反的明确模式
    const next: ThemeMode = get().resolved === 'dark' ? 'light' : 'dark';
    get().setMode(next);
  },
}));

/**
 * 应用启动时调用：写入 HTML class 并监听系统主题变化
 */
export const initTheme = () => {
  const mode = readStoredMode();
  applyResolvedTheme(resolveTheme(mode));
  useThemeStore.setState({ mode, resolved: resolveTheme(mode) });

  if (typeof window === 'undefined' || !window.matchMedia) return;

  const media = window.matchMedia(DARK_QUERY);
  const onChange = () => {
    const current = useThemeStore.getState().mode;
    const resolved = resolveTheme(current);
    applyResolvedTheme(resolved);
    useThemeStore.setState({ resolved });
  };

  // Safari < 14 只支持 addListener
  if (media.addEventListener) {
    media.addEventListener('change', onChange);
  } else if ((media as unknown as { addListener: (cb: () => void) => void }).addListener) {
    (media as unknown as { addListener: (cb: () => void) => void }).addListener(onChange);
  }
};
