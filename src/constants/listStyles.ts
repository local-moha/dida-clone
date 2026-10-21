/** 清单可选图标（滴答清单风格） */
export const LIST_ICONS = [
  '📋', '📥', '🗂️', '✅', '⭐', '🔥',
  '💡', '🎯', '🏠', '💼', '📚', '🎨',
  '🏃', '🍀', '🐱', '✈️', '🎁', '🔧',
  '💰', '🌈', '🧠', '📅', '🔔', '❤️',
];

/** 清单可选颜色 */
export const LIST_COLORS = [
  '#1890FF', // 蓝
  '#FF4D4F', // 红
  '#FFA940', // 橙
  '#52C41A', // 绿
  '#13C2C2', // 青
  '#9254DE', // 紫
  '#F759AB', // 洋红
  '#8C8C8C', // 灰
];

export const getRandomListColor = () =>
  LIST_COLORS[Math.floor(Math.random() * LIST_COLORS.length)];
