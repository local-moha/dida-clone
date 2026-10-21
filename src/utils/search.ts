import { Task } from '../types';

export interface HighlightSegment {
  text: string;
  matched: boolean;
}

/**
 * 参与搜索匹配的文本内容（标题、备注、清单名、标签名）
 */
export const buildTaskSearchIndex = (
  task: Task,
  listName: string,
  tagNames: string[]
): string =>
  [task.title, task.description, listName, ...tagNames].join('\n').toLowerCase();

/**
 * 把文本按关键词切分成若干片段，用于高亮渲染
 */
export const splitHighlight = (text: string, keyword: string): HighlightSegment[] => {
  const key = keyword.trim().toLowerCase();
  if (!key || !text) return [{ text, matched: false }];

  const lower = text.toLowerCase();
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const index = lower.indexOf(key, cursor);
    if (index === -1) {
      segments.push({ text: text.slice(cursor), matched: false });
      break;
    }
    if (index > cursor) {
      segments.push({ text: text.slice(cursor, index), matched: false });
    }
    segments.push({ text: text.slice(index, index + key.length), matched: true });
    cursor = index + key.length;
  }

  return segments;
};
