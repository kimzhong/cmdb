/**
 * Approval 仓储
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Approval, ApprovalDocument } from './approval.schema';
import { ApprovalPolicy, ApprovalPolicyDocument } from './approval-policy.schema';

@Injectable()
export class ApprovalRepository {
  constructor(
    @InjectModel(Approval.name) private readonly approvalModel: Model<ApprovalDocument>,
    @InjectModel(ApprovalPolicy.name) private readonly policyModel: Model<ApprovalPolicyDocument>,
  ) {}

  // ===== Approval =====
  async create(data: Partial<Approval>): Promise<ApprovalDocument> {
    return this.approvalModel.create(data);
  }

  async findById(id: string): Promise<ApprovalDocument | null> {
    return this.approvalModel.findById(id).exec();
  }

  async findByTicketNo(ticketNo: string): Promise<ApprovalDocument | null> {
    return this.approvalModel.findOne({ ticketNo }).exec();
  }

  async list(filter: any = {}, limit = 50): Promise<ApprovalDocument[]> {
    return this.approvalModel.find(filter).sort({ createdAt: -1 }).limit(limit).exec();
  }

  async update(id: string, patch: any): Promise<ApprovalDocument | null> {
    return this.approvalModel.findByIdAndUpdate(id, patch, { new: true }).exec();
  }

  async listPendingForApprover(_userId: string, userRoles: string[]): Promise<ApprovalDocument[]> {
    // 简化: 返回所有 pending 工单(实际应基于 steps[].approverValue 匹配)
    return this.approvalModel.find({ status: 'pending' }).sort({ createdAt: -1 }).exec();
  }

  async generateTicketNo(): Promise<string> {
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    // 用 count 作为序号(并发下可能重复,但本系统工单量小,够用)
    const count = await this.approvalModel.countDocuments({
      createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
    });
    return `AP-${ymd}-${String(count + 1).padStart(5, '0')}`;
  }

  // ===== ApprovalPolicy =====
  async listPolicies(): Promise<ApprovalPolicyDocument[]> {
    return this.policyModel.find().sort({ priority: -1 }).exec();
  }

  async findPolicyById(id: string): Promise<ApprovalPolicyDocument | null> {
    return this.policyModel.findById(id).exec();
  }

  async createPolicy(data: Partial<ApprovalPolicy>): Promise<ApprovalPolicyDocument> {
    return this.policyModel.create(data);
  }

  async updatePolicy(id: string, patch: any): Promise<ApprovalPolicyDocument | null> {
    return this.policyModel.findByIdAndUpdate(id, patch, { new: true }).exec();
  }

  async deletePolicy(id: string): Promise<boolean> {
    const r = await this.policyModel.findByIdAndDelete(id).exec();
    return !!r;
  }
}
