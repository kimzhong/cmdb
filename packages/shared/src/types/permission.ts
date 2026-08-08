/**
 * 细粒度权限 BC 共享类型
 */
import { Action } from './action';

/** 权限主体 */
export type PermissionSubjectType = 'role' | 'user';

/** 权限客体 */
export type PermissionObjectType = 'model' | 'resource' | 'menu' | 'route';

/** 权限效果 */
export type PermissionEffect = 'allow' | 'deny';

/** 行级条件 */
export interface PermissionCondition {
  field: string;
  op: 'eq' | 'in' | 'ne' | 'contains';
  value: any;
}

/** 权限定义 */
export interface Permission {
  id: string;
  subjectType: PermissionSubjectType;
  subjectId: string;
  objectType: PermissionObjectType;
  objectId?: string;
  actions: Action[];
  conditions?: PermissionCondition[];
  effect: PermissionEffect;
  priority: number;
  grantedBy: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** 行级条件评估函数(前端也复用) */
export function evaluateCondition(cond: PermissionCondition, context: Record<string, any>): boolean {
  const v = context[cond.field];
  switch (cond.op) {
    case 'eq':       return v === cond.value;
    case 'ne':       return v !== cond.value;
    case 'in':       return Array.isArray(cond.value) && cond.value.includes(v);
    case 'contains': return typeof v === 'string' && typeof cond.value === 'string' && v.includes(cond.value);
    default:         return false;
  }
}
