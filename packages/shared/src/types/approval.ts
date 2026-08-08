/**
 * 审批 BC 共享类型
 */
import { Action } from './action';

/** 审批工单类型 */
export enum ApprovalType {
  CREATE_RESOURCE = 'create_resource',
  UPDATE_RESOURCE = 'update_resource',
  DELETE_RESOURCE = 'delete_resource',
  CHANGE_STATE = 'change_state',
  ADD_RELATION = 'add_relation',
  REMOVE_RELATION = 'remove_relation',
  BULK_IMPORT = 'bulk_import',
  IP_ALLOCATE = 'ip_allocate',
}

/** 审批工单状态 */
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  APPLIED = 'applied',
}

/** 单步审批结果 */
export interface ApprovalDecision {
  stepIndex: number;
  approverId: string;
  approverName: string;
  decision: 'approve' | 'reject';
  comment: string;
  decidedAt: string; // ISO
}

/** 审批工单 */
export interface Approval {
  id: string;
  ticketNo: string;
  type: ApprovalType;
  targetType: string;
  targetId: string;
  payload: any;
  diff?: any;
  requesterId: string;
  requesterName: string;
  policyId: string;
  currentStep: number;
  totalSteps: number;
  status: ApprovalStatus;
  decisions: ApprovalDecision[];
  expiresAt: string;
  appliedAt?: string;
  result?: { success: boolean; error?: string };
  createdAt: string;
  updatedAt: string;
}

/** 审批策略步骤 */
export interface ApprovalPolicyStep {
  name: string;
  approverType: 'role' | 'user' | 'field_owner';
  approverValue: string;        // role: 'admin'; user: 'userId'; field: 'fieldName'
  timeoutHours: number;
}

/** 审批策略条件 */
export interface ApprovalPolicyCondition {
  field: string;
  op: 'eq' | 'ne' | 'in' | 'gt' | 'lt' | 'contains';
  value: any;
}

/** 审批策略 */
export interface ApprovalPolicy {
  id: string;
  name: string;
  description?: string;
  appliesTo: {
    type: 'resource' | 'relation' | 'subnet';
    modelUid?: string;
  };
  trigger: ApprovalType;
  conditions: ApprovalPolicyCondition[];
  steps: ApprovalPolicyStep[];
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

/** 审批决策的 action 与 ApprovalType 映射 */
export const ActionToApprovalType: Partial<Record<Action, ApprovalType>> = {
  [Action.CREATE]: ApprovalType.CREATE_RESOURCE,
  [Action.UPDATE]: ApprovalType.UPDATE_RESOURCE,
  [Action.DELETE]: ApprovalType.DELETE_RESOURCE,
  [Action.TRANSITION]: ApprovalType.CHANGE_STATE,
  [Action.APPROVE]: undefined, // 审批本身不需要被审批
};
