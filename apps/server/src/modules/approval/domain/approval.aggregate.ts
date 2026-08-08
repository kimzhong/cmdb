/**
 * Approval 聚合根
 *
 * 状态机: pending → approved/rejected/cancelled/expired → applied(approved 后才可 applied)
 */
import { ErrorCode } from '@cmdb/shared/types/error-code';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ApprovalStatus, ApprovalType, ApprovalDecision, ApprovalPolicy } from '@cmdb/shared/types/approval';

export interface ApprovalProps {
  id?: string;
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
  expiresAt: Date;
  appliedAt?: Date;
  result?: { success: boolean; error?: string };
  createdAt?: Date;
  updatedAt?: Date;
}

const TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  [ApprovalStatus.PENDING]:   [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.CANCELLED, ApprovalStatus.EXPIRED],
  [ApprovalStatus.APPROVED]:  [ApprovalStatus.APPLIED],
  [ApprovalStatus.REJECTED]:  [],
  [ApprovalStatus.CANCELLED]: [],
  [ApprovalStatus.EXPIRED]:   [],
  [ApprovalStatus.APPLIED]:   [],
};

export class Approval {
  readonly id: string;
  readonly ticketNo: string;
  readonly type: ApprovalType;
  readonly targetType: string;
  readonly targetId: string;
  readonly payload: any;
  readonly diff?: any;
  readonly requesterId: string;
  readonly requesterName: string;
  readonly policyId: string;
  currentStep: number;
  readonly totalSteps: number;
  status: ApprovalStatus;
  decisions: ApprovalDecision[];
  readonly expiresAt: Date;
  appliedAt?: Date;
  result?: { success: boolean; error?: string };
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(p: ApprovalProps) {
    this.id = p.id ?? '';
    this.ticketNo = p.ticketNo;
    this.type = p.type;
    this.targetType = p.targetType;
    this.targetId = p.targetId;
    this.payload = p.payload;
    this.diff = p.diff;
    this.requesterId = p.requesterId;
    this.requesterName = p.requesterName;
    this.policyId = p.policyId;
    this.currentStep = p.currentStep;
    this.totalSteps = p.totalSteps;
    this.status = p.status;
    this.decisions = p.decisions ?? [];
    this.expiresAt = p.expiresAt;
    this.appliedAt = p.appliedAt;
    this.result = p.result;
    this.createdAt = p.createdAt ?? new Date();
    this.updatedAt = p.updatedAt ?? new Date();
  }

  static create(p: Omit<ApprovalProps, 'status' | 'decisions' | 'expiresAt' | 'createdAt' | 'updatedAt'> & { expiresInHours?: number }): Approval {
    const expiresAt = new Date(Date.now() + (p.expiresInHours ?? 24 * 7) * 3600 * 1000);
    return new Approval({ ...p, status: ApprovalStatus.PENDING, decisions: [], expiresAt, createdAt: new Date(), updatedAt: new Date() });
  }

  static fromPersistence(p: ApprovalProps): Approval {
    return new Approval(p);
  }

  /** 审批通过(到下一步,最后一步则整体 approved) */
  approve(approverId: string, approverName: string, comment: string, at = new Date()): Approval {
    if (this.status !== ApprovalStatus.PENDING) {
      throw new BusinessException(ErrorCode.APPROVAL_ALREADY_DECIDED, `工单状态为 ${this.status}, 无法审批`);
    }
    if (this.expiresAt.getTime() < at.getTime()) {
      throw new BusinessException(ErrorCode.APPROVAL_EXPIRED);
    }
    this.decisions.push({ stepIndex: this.currentStep, approverId, approverName, decision: 'approve', comment, decidedAt: at.toISOString() });
    if (this.currentStep + 1 >= this.totalSteps) {
      this.status = ApprovalStatus.APPROVED;
    } else {
      this.currentStep += 1;
    }
    this.updatedAt = at;
    return this;
  }

  /** 审批拒绝 */
  reject(approverId: string, approverName: string, comment: string, at = new Date()): Approval {
    if (this.status !== ApprovalStatus.PENDING) {
      throw new BusinessException(ErrorCode.APPROVAL_ALREADY_DECIDED);
    }
    this.decisions.push({ stepIndex: this.currentStep, approverId, approverName, decision: 'reject', comment, decidedAt: at.toISOString() });
    this.status = ApprovalStatus.REJECTED;
    this.updatedAt = at;
    return this;
  }

  /** 撤销(仅 requester) */
  cancel(actorId: string, at = new Date()): Approval {
    if (this.status !== ApprovalStatus.PENDING) {
      throw new BusinessException(ErrorCode.APPROVAL_ALREADY_DECIDED);
    }
    if (actorId !== this.requesterId) {
      throw new BusinessException(ErrorCode.APPROVAL_PERMISSION_DENIED, '只有发起人可以撤销工单');
    }
    this.status = ApprovalStatus.CANCELLED;
    this.updatedAt = at;
    return this;
  }

  /** 标记为已应用(执行被批准的操作) */
  markApplied(result: { success: boolean; error?: string }, at = new Date()): Approval {
    if (this.status !== ApprovalStatus.APPROVED) {
      throw new BusinessException(ErrorCode.APPROVAL_ALREADY_DECIDED, '只有 approved 状态的工单可应用');
    }
    this.status = ApprovalStatus.APPLIED;
    this.appliedAt = at;
    this.result = result;
    this.updatedAt = at;
    return this;
  }

  /** 过期 */
  expire(at = new Date()): Approval {
    if (this.status === ApprovalStatus.PENDING && this.expiresAt.getTime() < at.getTime()) {
      this.status = ApprovalStatus.EXPIRED;
      this.updatedAt = at;
    }
    return this;
  }

  canTransitionTo(next: ApprovalStatus): boolean {
    return TRANSITIONS[this.status]?.includes(next) ?? false;
  }
}
