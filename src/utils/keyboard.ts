import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

/**
 * 判断当前按键事件是否发生在输入法（中文 / 日文 / 韩文等）的组合输入过程中。
 *
 * 使用中文输入法时，按 Enter 往往是「确认候选词」而不是「提交表单」。
 * 如果不做判断，输入框会被提前保存并退出编辑模式，导致中文内容无法上屏，
 * 而数字、英文（不涉及组合输入）却可以正常显示。
 */
export const isImeComposing = (e: ReactKeyboardEvent): boolean => {
  const native = e.nativeEvent;
  // keyCode 229 是部分浏览器 / WebView 在组合输入期间的取值
  return Boolean(native.isComposing) || native.keyCode === 229;
};

/**
 * 原生事件版本（用于 window 级别的全局快捷键监听）
 */
export const isNativeImeComposing = (e: KeyboardEvent): boolean =>
  Boolean(e.isComposing) || e.keyCode === 229;
