#!/usr/bin/env node
/**
 * dida-clone MCP server
 *
 * 直接读写 dida-clone 桌面版（Tauri）的本地 SQLite 数据库，
 * 让 AI 客户端通过 MCP 工具对任务 / 子任务 / 标签做增删改查。
 *
 * 数据库路径优先级：
 *   1. 命令行参数 --db <path>
 *   2. 环境变量 DIDA_DB_PATH
 *   3. 默认 Tauri 应用数据目录（%APPDATA%/<identifier>/dida.db）
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const APP_IDENTIFIER = process.env.DIDA_APP_IDENTIFIER ?? 'com.didaclone.app';
const SMART_LISTS = new Set([
  'smart_all',
  'smart_today',
  'smart_week',
  'smart_inbox',
  'smart_completed',
  'smart_trash',
]);

function defaultDbPath() {
  if (process.platform === 'win32') {
    const base = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(base, APP_IDENTIFIER, 'dida.db');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', APP_IDENTIFIER, 'dida.db');
  }
  const base = process.env.XDG_DATA_HOME ?? path.join(os.homedir(), '.local', 'share');
  return path.join(base, APP_IDENTIFIER, 'dida.db');
}

function resolveDbPath() {
  const flagIndex = process.argv.indexOf('--db');
  if (flagIndex !== -1 && process.argv[flagIndex + 1]) {
    return path.resolve(process.argv[flagIndex + 1]);
  }
  if (process.env.DIDA_DB_PATH) return path.resolve(process.env.DIDA_DB_PATH);
  return defaultDbPath();
}

const DB_PATH = resolveDbPath();
let dbConnection = null;

function db() {
  if (dbConnection) return dbConnection;

  if (!fs.existsSync(DB_PATH)) {
    throw new Error(
      `找不到数据库文件：${DB_PATH}\n` +
        '请先启动一次 dida-clone 桌面应用以生成数据库，或通过 DIDA_DB_PATH / --db 指定路径。'
    );
  }

  dbConnection = new DatabaseSync(DB_PATH);
  dbConnection.exec('PRAGMA busy_timeout = 5000');
  dbConnection.exec('PRAGMA foreign_keys = ON');
  return dbConnection;
}

/* ------------------------------------------------------------------ */
/* 通用工具                                                            */
/* ------------------------------------------------------------------ */

const PRIORITY_LABEL = { 0: 'none', 1: 'low', 2: 'medium', 3: 'high' };
const LABEL_PRIORITY = { none: 0, low: 1, medium: 2, high: 3 };
const TASK_COLUMNS = `t.id, t.title, t.description, t.list_id, t.completed, t.priority,
  t.due_date, t.reminder, t.repeat_rule, t.parent_id, t.order_num,
  t.is_deleted, t.created_at, t.updated_at, t.completed_at`;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function ok(data) {
  return {
    content: [
      { type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) },
    ],
  };
}

function fail(message) {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function runTool(fn) {
  return async (args) => {
    try {
      return ok(await fn(args ?? {}));
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  };
}

function parseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toPriority(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'number') {
    return Math.min(3, Math.max(0, Math.trunc(value)));
  }
  const label = String(value).toLowerCase();
  if (!(label in LABEL_PRIORITY)) {
    throw new Error('priority 只能是 0-3 或 none/low/medium/high');
  }
  return LABEL_PRIORITY[label];
}

function toTimestamp(value, field) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'number') {
    return value > 1e11 ? Math.floor(value / 1000) : Math.trunc(value);
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${field} 无法解析为时间：${value}（建议使用 ISO 格式，如 2026-10-20T09:00:00+08:00）`);
  }
  return Math.floor(parsed / 1000);
}

function isoOrNull(seconds) {
  return seconds == null ? null : new Date(seconds * 1000).toISOString();
}

function tagsByTaskId(taskIds) {
  const result = new Map();
  if (taskIds.length === 0) return result;

  const placeholders = taskIds.map(() => '?').join(', ');
  const rows = db()
    .prepare(
      `SELECT tt.task_id AS task_id, tg.id AS id, tg.name AS name, tg.color AS color
       FROM task_tags tt
       JOIN tags tg ON tg.id = tt.tag_id
       WHERE tt.task_id IN (${placeholders})`
    )
    .all(...taskIds);

  for (const row of rows) {
    if (!result.has(row.task_id)) result.set(row.task_id, []);
    result.get(row.task_id).push({ id: row.id, name: row.name, color: row.color });
  }
  return result;
}

function serializeTask(row, tags) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    list_id: row.list_id,
    completed: Boolean(row.completed),
    priority: row.priority ?? 0,
    priority_label: PRIORITY_LABEL[row.priority ?? 0] ?? 'none',
    due_date: row.due_date ?? null,
    due_date_iso: isoOrNull(row.due_date),
    reminder: row.reminder ?? null,
    repeat_rule: parseJson(row.repeat_rule),
    tags: tags ?? [],
    parent_id: row.parent_id ?? null,
    order: row.order_num ?? 0,
    is_deleted: Boolean(row.is_deleted),
    created_at: row.created_at,
    created_at_iso: isoOrNull(row.created_at),
    updated_at: row.updated_at,
    completed_at: row.completed_at ?? null,
  };
}

function fetchTask(taskId) {
  const row = db().prepare(`SELECT ${TASK_COLUMNS} FROM tasks t WHERE t.id = ?`).get(taskId);
  if (!row) throw new Error(`任务不存在：${taskId}`);
  return row;
}

function resolveTagIds(refs) {
  if (!refs || refs.length === 0) return [];
  const select = db().prepare('SELECT id FROM tags WHERE id = ? OR name = ?');
  return refs.map((ref) => {
    const row = select.get(ref, ref);
    if (!row) throw new Error(`标签不存在：${ref}（可用 list_tags 查看，或先用 create_tag 创建）`);
    return row.id;
  });
}

function syncTaskTags(taskId, tagRefs) {
  const tagIds = resolveTagIds(tagRefs);
  const conn = db();
  conn.prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId);
  const insert = conn.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)');
  for (const tagId of tagIds) insert.run(taskId, tagId);
}

function nextOrder(listId, parentId) {
  const row = parentId
    ? db()
        .prepare('SELECT MAX(order_num) AS max_order FROM tasks WHERE parent_id = ? AND is_deleted = 0')
        .get(parentId)
    : db()
        .prepare(
          'SELECT MAX(order_num) AS max_order FROM tasks WHERE list_id = ? AND parent_id IS NULL AND is_deleted = 0'
        )
        .get(listId);
  return (row?.max_order ?? -10) + 10;
}

function ensureList(listId) {
  const row = db().prepare('SELECT id, name FROM lists WHERE id = ?').get(listId);
  if (!row) throw new Error(`清单不存在：${listId}（可用 list_lists 查看可用清单）`);
  return row;
}

/* ------------------------------------------------------------------ */
/* 查询任务                                                            */
/* ------------------------------------------------------------------ */

function queryTasks(options) {
  const where = [];
  const params = [];
  const now = new Date();
  const endOfToday = Math.floor(
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime() / 1000
  );

  const listId = options.list_id;
  if (listId) {
    switch (listId) {
      case 'smart_all':
        where.push('t.is_deleted = 0');
        break;
      case 'smart_today':
        where.push('t.is_deleted = 0', 't.due_date IS NOT NULL', 't.due_date <= ?');
        params.push(endOfToday);
        break;
      case 'smart_week':
        where.push('t.is_deleted = 0', 't.due_date IS NOT NULL', 't.due_date <= ?');
        params.push(endOfToday + 7 * 86400);
        break;
      case 'smart_completed':
        where.push('t.is_deleted = 0', 't.completed = 1');
        break;
      case 'smart_trash':
        where.push('t.is_deleted = 1');
        break;
      default:
        where.push('t.is_deleted = 0', 't.list_id = ?');
        params.push(listId);
    }
  } else if (!options.include_deleted) {
    where.push('t.is_deleted = 0');
  }

  if (options.status === 'open') where.push('t.completed = 0');
  if (options.status === 'completed') where.push('t.completed = 1');

  if (options.parent_id) {
    where.push('t.parent_id = ?');
    params.push(options.parent_id);
  } else if (options.root_only) {
    where.push('t.parent_id IS NULL');
  }

  if (options.keyword) {
    where.push('(t.title LIKE ? OR t.description LIKE ?)');
    params.push(`%${options.keyword}%`, `%${options.keyword}%`);
  }

  const dueFrom = toTimestamp(options.due_from, 'due_from');
  if (dueFrom !== undefined) {
    where.push('t.due_date >= ?');
    params.push(dueFrom);
  }
  const dueTo = toTimestamp(options.due_to, 'due_to');
  if (dueTo !== undefined) {
    where.push('t.due_date <= ?');
    params.push(dueTo);
  }

  if (options.tag) {
    where.push(
      `EXISTS (
        SELECT 1 FROM task_tags tt JOIN tags tg ON tg.id = tt.tag_id
        WHERE tt.task_id = t.id AND (tt.tag_id = ? OR tg.name = ?)
      )`
    );
    params.push(options.tag, options.tag);
  }

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const sql = `SELECT ${TASK_COLUMNS} FROM tasks t
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY t.completed ASC, t.order_num ASC, t.created_at DESC
    LIMIT ?`;

  const rows = db().prepare(sql).all(...params, limit);
  const tagMap = tagsByTaskId(rows.map((row) => row.id));
  return rows.map((row) => serializeTask(row, tagMap.get(row.id)));
}

/* ------------------------------------------------------------------ */
/* MCP server                                                          */
/* ------------------------------------------------------------------ */

const server = new McpServer(
  { name: 'dida-clone', version: '1.0.0' },
  {
    instructions:
      '操作 dida-clone 本地任务数据。清单/标签用 list_lists / list_tags 查询；' +
      '任务用 list_tasks 检索、create_task 新建、update_task 修改、set_task_completed 完成、' +
      'delete_task 删除（默认软删除进垃圾桶）、restore_task 恢复。' +
      '时间为 Unix 秒，也可传 ISO 字符串。priority 为 0-3（none/low/medium/high）。' +
      '修改后桌面端需切换视图或重启才能看到最新数据。',
  }
);

server.registerTool(
  'list_lists',
  {
    title: '列出清单',
    description: '列出所有清单（含智能清单），返回 id、名称、图标、颜色、是否智能清单。写任务时用 id 作为 list_id。',
    inputSchema: {},
  },
  runTool(async () => {
    const rows = db()
      .prepare('SELECT id, name, icon, color, is_smart, order_num, created_at FROM lists ORDER BY order_num ASC, created_at ASC')
      .all();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      is_smart: Boolean(row.is_smart),
      is_virtual: SMART_LISTS.has(row.id) && row.id !== 'smart_inbox',
      order: row.order_num,
    }));
  })
);

server.registerTool(
  'list_tags',
  {
    title: '列出标签',
    description: '列出所有标签（id、名称、颜色、父标签、是否置顶）。',
    inputSchema: {},
  },
  runTool(async () => {
    const rows = db()
      .prepare('SELECT id, name, color, parent_id, is_pinned FROM tags ORDER BY is_pinned DESC, name ASC')
      .all();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      parent_id: row.parent_id ?? null,
      is_pinned: Boolean(row.is_pinned),
    }));
  })
);

server.registerTool(
  'create_tag',
  {
    title: '新建标签',
    description: '创建一个新标签，返回其 id。',
    inputSchema: {
      name: z.string().min(1).describe('标签名称，需唯一'),
      color: z.string().optional().describe('十六进制颜色，如 #3B82F6'),
      parent_id: z.string().optional().describe('父标签 id'),
    },
  },
  runTool(async ({ name, color, parent_id }) => {
    const existing = db().prepare('SELECT id FROM tags WHERE name = ?').get(name);
    if (existing) throw new Error(`标签已存在：${name}（id: ${existing.id}）`);

    const id = crypto.randomUUID();
    db()
      .prepare('INSERT INTO tags (id, name, color, parent_id, is_pinned, created_at) VALUES (?, ?, ?, ?, 0, ?)')
      .run(id, name, color ?? '#3B82F6', parent_id ?? null, nowSeconds());
    return { id, name, color: color ?? '#3B82F6', parent_id: parent_id ?? null };
  })
);

server.registerTool(
  'list_tasks',
  {
    title: '查询任务',
    description:
      '按清单、状态、关键词、日期范围、标签、父任务等条件检索任务。默认只返回未删除、未完成的任务，最多 50 条。' +
      'list_id 支持 smart_all / smart_today / smart_week / smart_inbox / smart_completed / smart_trash。',
    inputSchema: {
      list_id: z.string().optional().describe('清单 id，可传智能清单 id'),
      status: z.enum(['open', 'completed', 'all']).optional().describe('完成状态，默认 open'),
      keyword: z.string().optional().describe('标题或描述关键词'),
      tag: z.string().optional().describe('标签 id 或名称'),
      parent_id: z.string().optional().describe('只看某个任务的子任务'),
      root_only: z.boolean().optional().describe('只看顶层任务（无父任务）'),
      due_from: z.union([z.string(), z.number()]).optional().describe('截止时间下界（ISO 或 Unix 秒）'),
      due_to: z.union([z.string(), z.number()]).optional().describe('截止时间上界（ISO 或 Unix 秒）'),
      include_deleted: z.boolean().optional().describe('包含垃圾桶中的任务'),
      limit: z.number().optional().describe('返回条数，默认 50，最大 200'),
    },
  },
  runTool(async (args) => queryTasks(args))
);

server.registerTool(
  'get_task',
  {
    title: '获取任务详情',
    description: '按 id 获取任务完整信息；with_subtasks=true 时同时返回其子任务。',
    inputSchema: {
      task_id: z.string().describe('任务 id'),
      with_subtasks: z.boolean().optional().describe('是否附带子任务，默认 false'),
    },
  },
  runTool(async ({ task_id, with_subtasks }) => {
    const row = fetchTask(task_id);
    const tagMap = tagsByTaskId([task_id]);
    const task = serializeTask(row, tagMap.get(task_id));
    if (!with_subtasks) return task;

    const children = queryTasks({ parent_id: task_id, status: 'all' });
    return { ...task, subtasks: children };
  })
);

server.registerTool(
  'create_task',
  {
    title: '新建任务',
    description:
      '创建任务；传 parent_id 时创建为子任务（默认继承父任务截止时间与清单）。' +
      'tags 可传标签 id 或名称，必须是已存在的标签。',
    inputSchema: {
      title: z.string().min(1).describe('任务标题'),
      list_id: z.string().optional().describe('清单 id，默认 smart_inbox'),
      description: z.string().optional().describe('描述，支持 Markdown'),
      due_date: z.union([z.string(), z.number()]).nullable().optional().describe('截止时间（ISO 或 Unix 秒）'),
      reminder: z.string().nullable().optional().describe('提醒时间字符串，沿用应用内格式'),
      priority: z.union([z.number(), z.enum(['none', 'low', 'medium', 'high'])]).optional(),
      tags: z.array(z.string()).optional().describe('标签 id 或名称数组'),
      parent_id: z.string().optional().describe('父任务 id，用于创建子任务'),
      repeat_rule: z
        .object({
          type: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly', 'weekday', 'custom']),
          interval: z.number().optional(),
          daysOfWeek: z.array(z.number()).optional(),
          dayOfMonth: z.number().optional(),
          monthOfYear: z.number().optional(),
          endDate: z.number().optional(),
        })
        .nullable()
        .optional()
        .describe('重复规则'),
    },
  },
  runTool(async (args) => {
    const conn = db();
    const parent = args.parent_id ? fetchTask(args.parent_id) : null;
    const listId = args.list_id ?? parent?.list_id ?? 'smart_inbox';
    ensureList(listId);

    const id = crypto.randomUUID();
    const now = nowSeconds();
    const dueDate =
      args.due_date !== undefined ? toTimestamp(args.due_date, 'due_date') : (parent?.due_date ?? null);
    const order = nextOrder(listId, args.parent_id ?? null);
    const priority = toPriority(args.priority) ?? 0;

    conn.exec('BEGIN');
    try {
      conn
        .prepare(
          `INSERT INTO tasks (id, title, description, list_id, completed, priority, due_date, reminder,
             repeat_rule, parent_id, order_num, is_deleted, created_at, updated_at, completed_at)
           VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0, ?, ?, NULL)`
        )
        .run(
          id,
          args.title.trim(),
          args.description ?? '',
          listId,
          priority,
          dueDate,
          args.reminder ?? null,
          args.repeat_rule ? JSON.stringify(args.repeat_rule) : null,
          args.parent_id ?? null,
          order,
          now,
          now
        );
      syncTaskTags(id, args.tags ?? []);
      conn.exec('COMMIT');
    } catch (error) {
      conn.exec('ROLLBACK');
      throw error;
    }

    const row = fetchTask(id);
    return serializeTask(row, tagsByTaskId([id]).get(id));
  })
);

server.registerTool(
  'update_task',
  {
    title: '修改任务',
    description:
      '按 id 更新任务字段，只修改传入的字段。due_date / reminder / repeat_rule 传 null 可清空；' +
      'tags 传数组时整体替换（传 [] 清空）。',
    inputSchema: {
      task_id: z.string().describe('任务 id'),
      title: z.string().optional(),
      description: z.string().optional(),
      list_id: z.string().optional().describe('移动到另一个清单'),
      priority: z.union([z.number(), z.enum(['none', 'low', 'medium', 'high'])]).optional(),
      due_date: z.union([z.string(), z.number()]).nullable().optional(),
      reminder: z.string().nullable().optional(),
      repeat_rule: z
        .object({
          type: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly', 'weekday', 'custom']),
          interval: z.number().optional(),
          daysOfWeek: z.array(z.number()).optional(),
          dayOfMonth: z.number().optional(),
          monthOfYear: z.number().optional(),
          endDate: z.number().optional(),
        })
        .nullable()
        .optional(),
      tags: z.array(z.string()).optional(),
      parent_id: z.string().nullable().optional().describe('改为子任务（传 null 变为顶层任务）'),
      order: z.number().optional().describe('排序值，越小越靠前'),
    },
  },
  runTool(async (args) => {
    const conn = db();
    fetchTask(args.task_id);
    const sets = [];
    const params = [];

    const add = (column, value) => {
      sets.push(`${column} = ?`);
      params.push(value);
    };

    if (args.title !== undefined) add('title', args.title.trim());
    if (args.description !== undefined) add('description', args.description);
    if (args.list_id !== undefined) {
      ensureList(args.list_id);
      add('list_id', args.list_id);
    }
    const priority = toPriority(args.priority);
    if (priority !== undefined) add('priority', priority);
    const dueDate = toTimestamp(args.due_date, 'due_date');
    if (dueDate !== undefined) add('due_date', dueDate);
    if (args.reminder !== undefined) add('reminder', args.reminder);
    if (args.repeat_rule !== undefined) {
      add('repeat_rule', args.repeat_rule ? JSON.stringify(args.repeat_rule) : null);
    }
    if (args.parent_id !== undefined) add('parent_id', args.parent_id);
    if (args.order !== undefined) add('order_num', args.order);

    add('updated_at', nowSeconds());
    params.push(args.task_id);

    conn.exec('BEGIN');
    try {
      conn.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      if (args.tags !== undefined) syncTaskTags(args.task_id, args.tags);
      conn.exec('COMMIT');
    } catch (error) {
      conn.exec('ROLLBACK');
      throw error;
    }

    const row = fetchTask(args.task_id);
    return serializeTask(row, tagsByTaskId([args.task_id]).get(args.task_id));
  })
);

server.registerTool(
  'set_task_completed',
  {
    title: '完成 / 取消完成任务',
    description:
      '设置任务完成状态。完成父任务时会同步完成其所有未完成子任务（与桌面端行为一致）；取消完成只影响该任务。',
    inputSchema: {
      task_id: z.string().describe('任务 id'),
      completed: z.boolean().describe('true 完成，false 取消完成'),
    },
  },
  runTool(async ({ task_id, completed }) => {
    const conn = db();
    fetchTask(task_id);
    const now = nowSeconds();

    conn.exec('BEGIN');
    try {
      conn
        .prepare('UPDATE tasks SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?')
        .run(completed ? 1 : 0, completed ? now : null, now, task_id);

      if (completed) {
        conn
          .prepare(
            'UPDATE tasks SET completed = 1, completed_at = ?, updated_at = ? WHERE parent_id = ? AND completed = 0 AND is_deleted = 0'
          )
          .run(now, now, task_id);
      }
      conn.exec('COMMIT');
    } catch (error) {
      conn.exec('ROLLBACK');
      throw error;
    }

    return serializeTask(fetchTask(task_id), tagsByTaskId([task_id]).get(task_id));
  })
);

server.registerTool(
  'delete_task',
  {
    title: '删除任务',
    description: '默认软删除（移入垃圾桶，可恢复）；permanent=true 时彻底删除（连同子任务）。',
    inputSchema: {
      task_id: z.string().describe('任务 id'),
      permanent: z.boolean().optional().describe('是否彻底删除，默认 false'),
    },
  },
  runTool(async ({ task_id, permanent }) => {
    const conn = db();
    fetchTask(task_id);

    if (permanent) {
      const info = conn.prepare('DELETE FROM tasks WHERE id = ?').run(task_id);
      return { deleted: true, permanent: true, task_id, changes: Number(info.changes) };
    }

    conn
      .prepare('UPDATE tasks SET is_deleted = 1, updated_at = ? WHERE id = ?')
      .run(nowSeconds(), task_id);
    return { deleted: true, permanent: false, task_id, hint: '可用 restore_task 从垃圾桶恢复' };
  })
);

server.registerTool(
  'restore_task',
  {
    title: '恢复任务',
    description: '把垃圾桶中的任务恢复为未删除状态。',
    inputSchema: { task_id: z.string().describe('任务 id') },
  },
  runTool(async ({ task_id }) => {
    fetchTask(task_id);
    db()
      .prepare('UPDATE tasks SET is_deleted = 0, updated_at = ? WHERE id = ?')
      .run(nowSeconds(), task_id);
    return { restored: true, task_id };
  })
);

server.registerTool(
  'get_database_info',
  {
    title: '查看数据库信息',
    description: '返回当前连接的数据库路径与任务/清单/标签数量，用于排查 MCP 是否连到正确的库。',
    inputSchema: {},
  },
  runTool(async () => {
    const counts = db()
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM tasks) AS tasks,
           (SELECT COUNT(*) FROM tasks WHERE is_deleted = 0) AS active_tasks,
           (SELECT COUNT(*) FROM tasks WHERE is_deleted = 1) AS deleted_tasks,
           (SELECT COUNT(*) FROM lists) AS lists,
           (SELECT COUNT(*) FROM tags) AS tags`
      )
      .get();
    return { db_path: DB_PATH, ...counts };
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[dida-clone-mcp] 已启动，数据库：${DB_PATH}`);
}

main().catch((error) => {
  console.error('[dida-clone-mcp] 启动失败：', error);
  process.exit(1);
});
