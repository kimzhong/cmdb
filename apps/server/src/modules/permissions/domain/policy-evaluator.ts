/**
 * PolicyEvaluator - 细粒度权限评估器
 */
import { Injectable } from '@nestjs/common';
import { Action } from '@cmdb/shared/types/action';
import { evaluateCondition, Permission, PermissionCondition } from '@cmdb/shared/types/permission';

@Injectable()
export class PolicyEvaluator {
  /**
   * 单点检查
   */
  can(user: { id: string; roles: string[] }, action: Action, target: { type: string; id?: string; data?: any }, permissions: Permission[]): boolean {
    // 用户的有效 subject: user 自己 + 所有 role
    const subjects: { type: 'user' | 'role'; id: string }[] = [
      { type: 'user', id: user.id },
      ...user.roles.map((r) => ({ type: 'role' as const, id: r })),
    ];
    // 收集匹配此 target 的权限
    const matched = permissions.filter((p) => {
      if (!p.actions.includes(action)) return false;
      if (p.objectType !== target.type) return false;
      if (p.objectId && target.id && p.objectId !== target.id) return false;
      return true;
    });
    // 按 priority 降序,deny 优先
    matched.sort((a, b) => b.priority - a.priority);
    for (const p of matched) {
      // 主体匹配
      if (!subjects.some((s) => s.type === p.subjectType && s.id === p.subjectId)) continue;
      // 行级条件
      if (p.conditions && p.conditions.length > 0) {
        const ctx = target.data ?? {};
        const allMatch = p.conditions.every((c) => evaluateCondition(c, ctx));
        if (!allMatch) continue;
      }
      if (p.effect === 'deny') return false;
      return true;
    }
    return false; // 默认拒绝
  }

  /** 批量过滤 */
  filter<T extends { id: string; data?: any }>(user: { id: string; roles: string[] }, action: Action, resources: T[], permissions: Permission[]): T[] {
    return resources.filter((r) => this.can(user, action, { type: 'resource', id: r.id, data: r.data }, permissions));
  }
}
