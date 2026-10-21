import { RefObject, useLayoutEffect, useState } from 'react';

/**
 * 监听元素宽度变化（基于 ResizeObserver）。
 * 用于实现响应式布局：按可用宽度决定显示日历 / 任务列表 / 详情面板。
 */
export function useElementWidth<T extends HTMLElement>(ref: RefObject<T | null>): number {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerWidth
  );

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = (value: number) => {
      setWidth((prev) => (Math.abs(prev - value) < 1 ? prev : value));
    };

    // 先同步测量一次，避免首帧布局跳动
    update(element.getBoundingClientRect().width);

    if (typeof ResizeObserver === 'undefined') {
      const handleResize = () => update(element.getBoundingClientRect().width);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) update(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
