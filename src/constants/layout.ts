/**
 * 日历视图的响应式断点（基于日历区域可用宽度，单位 px）
 *
 * 窄：只显示日历
 * 中 / 宽：日历 + 任务列表
 *
 * 备注：任务详情不再作为日历的并排列，点击任务时以浮层形式弹出（见 App.tsx）。
 */
export const CALENDAR_BREAKPOINTS = {
  /** 超过该宽度显示右侧任务列表 */
  dayPanel: 740,
} as const;
