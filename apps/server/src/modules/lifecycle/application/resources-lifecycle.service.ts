/**
 * Resources-Lifecycle 应用服务
 * 编排 LifecycleService + Resources 实际 IO
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
import { LifecycleState } from '@cmdb/shared/types';
import { LifecycleService, TransitionCommand, LifecycleSnapshot } from '../domain/lifecycle.service';
import { ModelsService } from '../../meta-model/models/models.service';
import { DynamicSchemaFactory } from '../../resources/dynamic-schema.factory';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '@cmdb/shared/types/error-code';

export interface TransitionDto {
  to: LifecycleState;
  reason?: string;
  actor: string;
}

@Injectable()
export class ResourcesLifecycleService {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly factory: DynamicSchemaFactory,
    private readonly lifecycle: LifecycleService,
    private readonly emitter: EventEmitter2,
  ) {}

  /** 状态变更 */
  async transition(modelUid: string, resourceId: string, dto: TransitionDto): Promise<any> {
    const def = await this.modelsService.findByUid(modelUid);
    const M = await this.factory.getModelFor(def);
    if (!Types.ObjectId.isValid(resourceId)) {
      throw new BusinessException(ErrorCode.INVALID_INPUT, 'id 非法');
    }
    const doc = await M.findById(resourceId);
    if (!doc) throw new NotFoundException(`资源 ${resourceId} 不存在`);

    const snapshot: LifecycleSnapshot | undefined = doc.get('lifecycle');
    const newSnap = this.lifecycle.applyTransition(snapshot, {
      resourceId,
      from: snapshot?.state ?? LifecycleState.IN_USE,
      to: dto.to,
      reason: dto.reason,
      actor: dto.actor,
    });
    doc.set('lifecycle', newSnap);
    await doc.save();
    this.emitter.emit('resource.stateChanged', { resourceId, modelUid, from: snapshot?.state, to: dto.to, actor: dto.actor });
    return doc.toObject();
  }

  /** 软删除 */
  async softDelete(modelUid: string, resourceId: string, actor: string): Promise<void> {
    const def = await this.modelsService.findByUid(modelUid);
    const M = await this.factory.getModelFor(def);
    if (!Types.ObjectId.isValid(resourceId)) {
      throw new BusinessException(ErrorCode.INVALID_INPUT, 'id 非法');
    }
    const doc = await M.findById(resourceId);
    if (!doc) throw new NotFoundException(`资源 ${resourceId} 不存在`);
    const snapshot = doc.get('lifecycle');
    const newSnap = this.lifecycle.applySoftDelete(snapshot, actor);
    doc.set('lifecycle', newSnap);
    doc.set('deletedAt', new Date());
    doc.set('deletedBy', actor);
    await doc.save();
    this.emitter.emit('resource.deleted', { resourceId, modelUid, actor });
  }

  /** 恢复 */
  async restore(modelUid: string, resourceId: string, actor: string): Promise<any> {
    const def = await this.modelsService.findByUid(modelUid);
    const M = await this.factory.getModelFor(def);
    if (!Types.ObjectId.isValid(resourceId)) {
      throw new BusinessException(ErrorCode.INVALID_INPUT, 'id 非法');
    }
    const doc = await M.findById(resourceId);
    if (!doc) throw new NotFoundException(`资源 ${resourceId} 不存在`);
    if (doc.get('deletedAt') == null) {
      throw new BusinessException(ErrorCode.LIFECYCLE_INVALID_TRANSITION, '资源未删除,无需恢复');
    }
    const snapshot = doc.get('lifecycle');
    const newSnap = this.lifecycle.applyRestore(snapshot, actor);
    doc.set('lifecycle', newSnap);
    doc.set('deletedAt', null);
    doc.set('deletedBy', null);
    await doc.save();
    this.emitter.emit('resource.restored', { resourceId, modelUid, actor });
    return doc.toObject();
  }

  /** 物理删除(仅 admin 调试用) */
  async purge(modelUid: string, resourceId: string): Promise<void> {
    const def = await this.modelsService.findByUid(modelUid);
    const M = await this.factory.getModelFor(def);
    if (!Types.ObjectId.isValid(resourceId)) {
      throw new BusinessException(ErrorCode.INVALID_INPUT, 'id 非法');
    }
    const r = await M.deleteOne({ _id: new Types.ObjectId(resourceId) });
    if (r.deletedCount === 0) throw new NotFoundException(`资源 ${resourceId} 不存在`);
  }

  /** 列出可用的状态变更 */
  async nextStates(modelUid: string, resourceId: string): Promise<LifecycleState[]> {
    const def = await this.modelsService.findByUid(modelUid);
    const M = await this.factory.getModelFor(def);
    if (!Types.ObjectId.isValid(resourceId)) {
      throw new BusinessException(ErrorCode.INVALID_INPUT, 'id 非法');
    }
    const doc = await M.findById(resourceId).lean();
    if (!doc) throw new NotFoundException(`资源 ${resourceId} 不存在`);
    const current = (doc as any).lifecycle?.state ?? LifecycleState.IN_USE;
    return this.lifecycle.nextStates(current);
  }
}
