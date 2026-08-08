/**
 * Approvals 应用服务
 */
import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Approval } from '../domain/approval.aggregate';
import { PolicyEvaluator } from '../domain/policy-evaluator';
import { ApprovalRepository } from '../infra/approval.repository';
import { Action } from '@cmdb/shared/types/action';
import { ApprovalStatus, ApprovalType } from '@cmdb/shared/types/approval';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '@cmdb/shared/types/error-code';

export interface CreateApprovalDto {
  type: ApprovalType;
  targetType: string;
  targetId: string;
  payload: any;
  diff?: any;
  requesterId: string;
  requesterName: string;
}

@Injectable()
export class ApprovalsService implements OnModuleInit {
  constructor(
    private readonly repo: ApprovalRepository,
    private readonly evaluator: PolicyEvaluator,
    private readonly emitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // 监听资源状态变更,做审计
    this.emitter.on('approval.applied', (e) => {
      this.emitter.emit('audit.log', { type: 'approval_applied', ...e });
    });
  }

  /** 列出工单 */
  async list(filter: { status?: string; requesterId?: string; type?: string; targetType?: string; targetId?: string; mine?: boolean; currentUserId?: string; currentUserRoles?: string[] } = {}) {
    const q: any = {};
    if (filter.status) q.status = filter.status;
    if (filter.requesterId) q.requesterId = filter.requesterId;
    if (filter.type) q.type = filter.type;
    if (filter.targetType) q.targetType = filter.targetType;
    if (filter.targetId) q.targetId = filter.targetId;
    if (filter.mine === true && filter.currentUserId) {
      // 待我审批: 简化版,返回所有 pending
      q.status = ApprovalStatus.PENDING;
    }
    const docs = await this.repo.list(q, 200);
    return docs.map((d) => this.toDto(d.toObject()));
  }

  /** 详情 */
  async findById(id: string) {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundException(`工单 ${id} 不存在`);
    return this.toDto(doc.toObject());
  }

  /** 创建工单(自动选策略) */
  async create(dto: CreateApprovalDto) {
    const policies = await this.repo.listPolicies();
    const policy = this.evaluator.findMatchingPolicy(this.inferAction(dto.type), {
      type: dto.targetType,
      data: dto.payload,
    }, policies as any);
    if (!policy) {
      throw new BusinessException(ErrorCode.APPROVAL_NOT_FOUND, '找不到匹配的审批策略');
    }
    const ticketNo = await this.repo.generateTicketNo();
    const policySteps = (policy as any).steps ?? [];
    const approval = Approval.create({
      ticketNo,
      type: dto.type,
      targetType: dto.targetType,
      targetId: dto.targetId,
      payload: dto.payload,
      diff: dto.diff,
      requesterId: dto.requesterId,
      requesterName: dto.requesterName,
      policyId: (policy as any)._id.toString(),
      currentStep: 0,
      totalSteps: policySteps.length,
    });
    const doc = await this.repo.create(approval as any);
    this.emitter.emit('approval.requested', { approvalId: doc._id.toString(), ticketNo });
    return this.toDto(doc.toObject());
  }

  /** 审批通过 */
  async approve(id: string, approverId: string, approverName: string, comment: string) {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundException(`工单 ${id} 不存在`);
    const approval = Approval.fromPersistence(this.toProps(doc.toObject()));
    approval.approve(approverId, approverName, comment);
    const updated = await this.repo.update(id, {
      status: approval.status,
      currentStep: approval.currentStep,
      decisions: approval.decisions,
      updatedAt: approval.updatedAt,
    });
    this.emitter.emit('approval.decided', { approvalId: id, decision: 'approve', approverId });
    if (approval.status === ApprovalStatus.APPROVED) {
      // 异步自动应用(留给调度器或手动 apply)
      this.emitter.emit('approval.approved', { approvalId: id, approval: updated?.toObject() });
    }
    return this.toDto(updated!.toObject());
  }

  /** 审批拒绝 */
  async reject(id: string, approverId: string, approverName: string, comment: string) {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundException(`工单 ${id} 不存在`);
    const approval = Approval.fromPersistence(this.toProps(doc.toObject()));
    approval.reject(approverId, approverName, comment);
    const updated = await this.repo.update(id, {
      status: approval.status,
      decisions: approval.decisions,
      updatedAt: approval.updatedAt,
    });
    this.emitter.emit('approval.decided', { approvalId: id, decision: 'reject', approverId });
    return this.toDto(updated!.toObject());
  }

  /** 撤销 */
  async cancel(id: string, actorId: string) {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundException(`工单 ${id} 不存在`);
    const approval = Approval.fromPersistence(this.toProps(doc.toObject()));
    approval.cancel(actorId);
    const updated = await this.repo.update(id, {
      status: approval.status,
      updatedAt: approval.updatedAt,
    });
    return this.toDto(updated!.toObject());
  }

  /** 标记已应用 */
  async markApplied(id: string, result: { success: boolean; error?: string }) {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundException(`工单 ${id} 不存在`);
    const approval = Approval.fromPersistence(this.toProps(doc.toObject()));
    approval.markApplied(result);
    const updated = await this.repo.update(id, {
      status: approval.status,
      appliedAt: approval.appliedAt,
      result: approval.result,
      updatedAt: approval.updatedAt,
    });
    this.emitter.emit('approval.applied', { approvalId: id, result });
    return this.toDto(updated!.toObject());
  }

  private inferAction(type: ApprovalType): Action {
    switch (type) {
      case ApprovalType.CREATE_RESOURCE:    return Action.CREATE;
      case ApprovalType.UPDATE_RESOURCE:    return Action.UPDATE;
      case ApprovalType.DELETE_RESOURCE:    return Action.DELETE;
      case ApprovalType.CHANGE_STATE:       return Action.TRANSITION;
      default:                              return Action.UPDATE;
    }
  }

  private toDto(d: any) {
    return {
      id: d._id?.toString(),
      ticketNo: d.ticketNo,
      type: d.type,
      targetType: d.targetType,
      targetId: d.targetId,
      payload: d.payload,
      diff: d.diff,
      requesterId: d.requesterId,
      requesterName: d.requesterName,
      policyId: d.policyId,
      currentStep: d.currentStep,
      totalSteps: d.totalSteps,
      status: d.status,
      decisions: d.decisions ?? [],
      expiresAt: d.expiresAt,
      appliedAt: d.appliedAt,
      result: d.result,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  private toProps(d: any): any {
    return { ...d, id: d._id?.toString() };
  }
}
