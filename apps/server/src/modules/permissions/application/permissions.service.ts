/**
 * Permissions 应用服务
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionDocument } from '../infra/permission.schema';
import { PolicyEvaluator } from '../domain/policy-evaluator';
import { Action } from '@cmdb/shared/types/action';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name) private readonly model: Model<PermissionDocument>,
    public readonly evaluator: PolicyEvaluator,
  ) {}

  async list(filter: { subjectType?: string; subjectId?: string } = {}) {
    const q: any = {};
    if (filter.subjectType) q.subjectType = filter.subjectType;
    if (filter.subjectId) q.subjectId = filter.subjectId;
    const docs = await this.model.find(q).sort({ priority: -1 }).exec();
    return docs.map((d) => d.toObject());
  }

  async grant(dto: Partial<Permission>) {
    const doc = await this.model.create(dto);
    return doc.toObject();
  }

  async update(id: string, patch: any) {
    const doc = await this.model.findByIdAndUpdate(id, patch, { new: true });
    if (!doc) return null;
    return doc.toObject();
  }

  async revoke(id: string) {
    const r = await this.model.findByIdAndDelete(id);
    return !!r;
  }

  /** 检查权限(内部用) */
  async check(user: { id: string; roles: string[] }, action: Action, target: { type: string; id?: string; data?: any }): Promise<{ allowed: boolean }> {
    const permissions = await this.model.find().lean();
    const allowed = this.evaluator.can(user, action, target, permissions as any);
    return { allowed };
  }
}
