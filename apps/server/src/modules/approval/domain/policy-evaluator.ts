/**
 * ApprovalPolicyEvaluator - 策略评估器
 *
 * 责任: 给定 (action, target, payload) 判断是否需要审批,以及命中哪个策略
 */
import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, ApprovalType, ApprovalPolicyCondition, ApprovalPolicyStep } from '@cmdb/shared/types/approval';
import { Action } from '@cmdb/shared/types/action';
import { LifecycleState } from '@cmdb/shared/types/action';

const ActionToApprovalType: Record<string, ApprovalType> = {
  [Action.CREATE]:     ApprovalType.CREATE_RESOURCE,
  [Action.UPDATE]:     ApprovalType.UPDATE_RESOURCE,
  [Action.DELETE]:     ApprovalType.DELETE_RESOURCE,
  [Action.TRANSITION]: ApprovalType.CHANGE_STATE,
};

@Injectable()
export class PolicyEvaluator {
  /**
   * 找出匹配的策略(按 priority 降序,返回第一个匹配的)
   */
  findMatchingPolicy(
    action: Action,
    target: { type: string; modelUid?: string; data?: any; userRole?: string },
    policies: ApprovalPolicy[],
  ): ApprovalPolicy | null {
    const triggerType = ActionToApprovalType[action];
    if (!triggerType) return null;
    const candidates = policies
      .filter((p) => p.enabled && p.trigger === triggerType)
      .sort((a, b) => b.priority - a.priority);
    for (const p of candidates) {
      if (this.matchesPolicy(p, target)) {
        return p;
      }
    }
    return null;
  }

  /** 命中条件判断(AND 关系) */
  private matchesPolicy(p: ApprovalPolicy, target: { type: string; modelUid?: string; data?: any; userRole?: string }): boolean {
    // 1. appliesTo.type
    if (p.appliesTo.type !== target.type) return false;
    // 2. appliesTo.modelUid(可选)
    if (p.appliesTo.modelUid && p.appliesTo.modelUid !== target.modelUid) return false;
    // 3. conditions(行级)
    if (p.conditions && p.conditions.length > 0) {
      for (const cond of p.conditions) {
        if (!this.matchCondition(cond, target)) return false;
      }
    }
    return true;
  }

  private matchCondition(cond: ApprovalPolicyCondition, target: { data?: any; userRole?: string }): boolean {
    let fieldValue: any;
    if (cond.field === '_userRole') {
      fieldValue = target.userRole;
    } else {
      fieldValue = target.data?.[cond.field];
    }
    switch (cond.op) {
      case 'eq':       return fieldValue === cond.value;
      case 'ne':       return fieldValue !== cond.value;
      case 'in':       return Array.isArray(cond.value) && cond.value.includes(fieldValue);
      case 'gt':       return typeof fieldValue === 'number' && fieldValue > cond.value;
      case 'lt':       return typeof fieldValue === 'number' && fieldValue < cond.value;
      case 'contains': return typeof fieldValue === 'string' && typeof cond.value === 'string' && fieldValue.includes(cond.value);
      default:         return false;
    }
  }

  /** 列出当前步骤的审批人(简化版:role-based 找 user) */
  resolveApprovers(step: ApprovalPolicyStep, _target: any, _userLookup: (roleOrUserId: string) => Promise<string[]>): Promise<string[]> {
    if (step.approverType === 'role' || step.approverType === 'user') {
      return _userLookup(step.approverValue);
    }
    return Promise.resolve([]);
  }
}
