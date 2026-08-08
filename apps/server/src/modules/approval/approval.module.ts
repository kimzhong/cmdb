/**
 * Approval 限界上下文 (F5)
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Approval, ApprovalSchema } from './infra/approval.schema';
import { ApprovalPolicy, ApprovalPolicySchema } from './infra/approval-policy.schema';
import { ApprovalRepository } from './infra/approval.repository';
import { ApprovalsService } from './application/approvals.service';
import { ApprovalsController } from './application/approvals.controller';
import { ApprovalPoliciesController } from './application/approval-policies.controller';
import { PolicyEvaluator } from './domain/policy-evaluator';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Approval.name, schema: ApprovalSchema },
      { name: ApprovalPolicy.name, schema: ApprovalPolicySchema },
    ]),
  ],
  controllers: [ApprovalsController, ApprovalPoliciesController],
  providers: [ApprovalRepository, ApprovalsService, PolicyEvaluator],
  exports: [ApprovalsService, ApprovalRepository, PolicyEvaluator],
})
export class ApprovalModule {}
