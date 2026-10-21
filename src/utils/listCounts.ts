import { List, Task } from '../types';
import { SMART_LIST_IDS } from '../constants/smartLists';

const isRootIncomplete = (task: Task) =>
  !task.is_deleted && !task.completed && !task.parent_id;

/**
 * 统计清单在侧边栏上展示的数量。
 * 只计算有确定性规则的场景，「今天 / 最近 7 天」依赖后端实时查询，不做本地估算。
 */
export const getListTaskCount = (
  list: List,
  tasks: Task[],
  trashTasks: Task[]
): number => {
  switch (list.id) {
    case SMART_LIST_IDS.TRASH:
      return trashTasks.filter((task) => task.is_deleted).length;
    case SMART_LIST_IDS.COMPLETED:
      return tasks.filter((task) => !task.is_deleted && task.completed).length;
    case SMART_LIST_IDS.ALL:
      return tasks.filter(isRootIncomplete).length;
    case SMART_LIST_IDS.TODAY:
    case SMART_LIST_IDS.WEEK:
      return 0;
    default:
      return tasks.filter((task) => task.list_id === list.id).filter(isRootIncomplete).length;
  }
};
