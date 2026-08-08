/**
 * Approval 限界上下文 (F5)
 *
 * 责任:
 *  - 审批策略管理 (approval_policies)
 *  - 审批工单 (approvals)
 *  - ApprovalEngine: 拦截/创建/审批/应用
 *
 * 上下游:
 *  - 被 resources / relations / ipam 等的写操作调用
 *  - 工单通过后发出 approval.applied 事件
 */
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class ApprovalModule {}
