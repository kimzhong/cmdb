/**
 * 通用动作与生命周期状态
 */

/** CRUD + 业务动作 */
export enum Action {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  TRANSITION = 'transition',
  EXECUTE = 'execute',
}

/** 资源生命周期状态 */
export enum LifecycleState {
  IN_STOCK = 'in_stock',       // 入库未分配
  IN_USE = 'in_use',           // 正在使用
  MAINTAINING = 'maintaining', // 维护中
  CHANGING = 'changing',       // 变更中
  RETIRED = 'retired',         // 退役
  DELETED = 'deleted',         // 软删除（回收站）
}

/** 状态机：定义每个状态可以变更到的目标状态 */
export const LifecycleStateTransitions: Record<LifecycleState, LifecycleState[]> = {
  [LifecycleState.IN_STOCK]:    [LifecycleState.IN_USE, LifecycleState.DELETED],
  [LifecycleState.IN_USE]:      [LifecycleState.MAINTAINING, LifecycleState.CHANGING, LifecycleState.RETIRED, LifecycleState.DELETED],
  [LifecycleState.MAINTAINING]: [LifecycleState.IN_USE, LifecycleState.RETIRED, LifecycleState.DELETED],
  [LifecycleState.CHANGING]:    [LifecycleState.IN_USE, LifecycleState.RETIRED, LifecycleState.DELETED],
  [LifecycleState.RETIRED]:     [LifecycleState.IN_STOCK, LifecycleState.DELETED],
  [LifecycleState.DELETED]:    [], // 软删除只能 restore（特殊接口，不通过 transition）
};

/** 状态机中文化标签(前端展示) */
export const LifecycleStateLabels: Record<LifecycleState, string> = {
  [LifecycleState.IN_STOCK]:    '在库',
  [LifecycleState.IN_USE]:      '在用',
  [LifecycleState.MAINTAINING]: '维护中',
  [LifecycleState.CHANGING]:    '变更中',
  [LifecycleState.RETIRED]:     '已退役',
  [LifecycleState.DELETED]:     '已删除',
};

/** 状态机颜色(Ant Design Tag 颜色) */
export const LifecycleStateColors: Record<LifecycleState, string> = {
  [LifecycleState.IN_STOCK]:    'default',
  [LifecycleState.IN_USE]:      'green',
  [LifecycleState.MAINTAINING]: 'orange',
  [LifecycleState.CHANGING]:    'blue',
  [LifecycleState.RETIRED]:     'red',
  [LifecycleState.DELETED]:     'default',
};

/** 判断两个状态之间能否直接转换 */
export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  if (from === to) return true;
  return LifecycleStateTransitions[from]?.includes(to) ?? false;
}
