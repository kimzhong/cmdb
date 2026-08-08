import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ModelsService } from '../meta-model/models/models.service';
import { FieldType, ModelDef } from '../meta-model/models/schemas/model.schema';
import { DynamicSchemaFactory } from './dynamic-schema.factory';
import { LifecycleState } from '@cmdb/shared/types';

interface ListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  includeTrash?: boolean; // v0.2: 是否包含已删除
}

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(
    private readonly modelsService: ModelsService,
    private readonly factory: DynamicSchemaFactory,
    private readonly emitter: EventEmitter2,
  ) {}

  /** 资源列表（按 modelUid） */
  async list(modelUid: string, params: ListParams) {
    const def = await this.modelsService.findByUid(modelUid);
    const M = await this.factory.getModelFor(def);

    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 20));
    const filter: Record<string, unknown> = {};
    if (params.keyword) {
      // 全文搜索：使用 $text
      filter.$text = { $search: params.keyword };
    }
    // v0.2: 默认不返回已删除(回收站)
    if (!params.includeTrash) {
      filter.$and = [
        { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
        { $or: [{ 'lifecycle.state': { $ne: LifecycleState.DELETED } }, { 'lifecycle.state': { $exists: false } }] },
      ];
    }

    const [docs, total] = await Promise.all([
      M.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      M.countDocuments(filter),
    ]);

    return { list: docs.map((d) => this.maskPasswords(d, def)), total, page, pageSize };
  }

  /** 资源详情 */
  async detail(modelUid: string, id: string, includeTrash = false) {
    const def = await this.modelsService.findByUid(modelUid);
    const M = await this.factory.getModelFor(def);
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const found = await M.findById(id).lean();
    if (!found) throw new NotFoundException(`资源 ${id} 不存在`);
    if (!includeTrash) {
      const deleted = (found as any).deletedAt != null || (found as any).lifecycle?.state === LifecycleState.DELETED;
      if (deleted) throw new NotFoundException(`资源 ${id} 不存在`);
    }
    return this.maskPasswords(found, def);
  }

  /** 新建资源 */
  async create(modelUid: string, body: Record<string, unknown>, actor = 'system') {
    const def = await this.modelsService.findByUid(modelUid);
    this.validateBody(def, body);
    const M = await this.factory.getModelFor(def);
    // 自动注入 uid 字段如果没传
    if (!body.uid) {
      body.uid = new Types.ObjectId().toString();
    }
    // v0.2: 默认 lifecycle.state = in_use
    (body as any).lifecycle = {
      state: LifecycleState.IN_USE,
      enteredAt: new Date(),
      enteredBy: actor,
    };
    (body as any).createdBy = actor;
    const created = await M.create(body);
    this.emitter.emit('resource.created', { resourceId: created._id.toString(), modelUid, actor });
    return this.maskPasswords(created.toObject(), def);
  }

  /** 更新资源 */
  async update(modelUid: string, id: string, body: Record<string, unknown>, actor = 'system') {
    const def = await this.modelsService.findByUid(modelUid);
    this.validateBody(def, body, true);
    const M = await this.factory.getModelFor(def);
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const found = await M.findById(id);
    if (!found) throw new NotFoundException(`资源 ${id} 不存在`);
    if ((found as any).deletedAt != null) {
      throw new BadRequestException('资源已删除,无法更新');
    }
    Object.assign(found, body);
    (found as any).updatedBy = actor;
    await found.save();
    return this.maskPasswords(found.toObject(), def);
  }

  /** 删除资源 (v0.2: 改成软删除) */
  async remove(modelUid: string, id: string, actor = 'system'): Promise<void> {
    const def = await this.modelsService.findByUid(modelUid);
    const M = await this.factory.getModelFor(def);
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const doc = await M.findById(id);
    if (!doc) throw new NotFoundException(`资源 ${id} 不存在`);
    if ((doc as any).deletedAt != null) {
      throw new BadRequestException('资源已在回收站');
    }
    (doc as any).lifecycle = {
      state: LifecycleState.DELETED,
      previousState: (doc as any).lifecycle?.state,
      enteredAt: new Date(),
      enteredBy: actor,
      history: [
        ...((doc as any).lifecycle?.history ?? []).slice(-19),
        {
          from: (doc as any).lifecycle?.state ?? LifecycleState.IN_USE,
          to: LifecycleState.DELETED,
          reason: 'soft delete via API',
          actor,
          at: new Date(),
        },
      ],
    };
    (doc as any).deletedAt = new Date();
    (doc as any).deletedBy = actor;
    await doc.save();
    this.emitter.emit('resource.deleted', { resourceId: id, modelUid, actor });
  }

  /** 批量删除 (v0.2: 软删除) */
  async batchRemove(modelUid: string, ids: string[], actor = 'system'): Promise<{ deleted: number }> {
    const def = await this.modelsService.findByUid(modelUid);
    const M = await this.factory.getModelFor(def);
    const valid = ids.filter((i) => Types.ObjectId.isValid(i)).map((i) => new Types.ObjectId(i));
    let n = 0;
    for (const oid of valid) {
      const doc = await M.findById(oid);
      if (!doc) continue;
      if ((doc as any).deletedAt != null) continue;
      (doc as any).lifecycle = {
        state: LifecycleState.DELETED,
        previousState: (doc as any).lifecycle?.state,
        enteredAt: new Date(),
        enteredBy: actor,
        history: [
          ...((doc as any).lifecycle?.history ?? []).slice(-19),
          {
            from: (doc as any).lifecycle?.state ?? LifecycleState.IN_USE,
            to: LifecycleState.DELETED,
            reason: 'batch soft delete',
            actor,
            at: new Date(),
          },
        ],
      };
      (doc as any).deletedAt = new Date();
      (doc as any).deletedBy = actor;
      await doc.save();
      n++;
    }
    if (n > 0) this.emitter.emit('resource.batchDeleted', { resourceIds: valid.map(String), modelUid, actor });
    return { deleted: n };
  }

  // ---------------- 内部工具 ----------------

  /** 按模型字段做基础校验（必填、正则、select 选项） */
  private validateBody(def: ModelDef, body: Record<string, unknown>, isUpdate = false) {
    for (const f of def.fields ?? []) {
      const v = body[f.uid];

      if (!isUpdate && f.required && (v === undefined || v === null || v === '')) {
        throw new BadRequestException(`字段 ${f.name} (${f.uid}) 必填`);
      }

      if (v === undefined || v === null) continue;

      switch (f.type) {
        case FieldType.Number:
          if (typeof v !== 'number' && Number.isNaN(Number(v))) {
            throw new BadRequestException(`字段 ${f.name} 必须是数字`);
          }
          break;
        case FieldType.Date:
          if (Number.isNaN(Date.parse(String(v)))) {
            throw new BadRequestException(`字段 ${f.name} 必须是合法日期`);
          }
          break;
        case FieldType.Select:
          if (!f.options?.some((o) => o.key === v)) {
            throw new BadRequestException(`字段 ${f.name} 取值非法`);
          }
          break;
        case FieldType.Password:
          // 明文即可，setter 会自动加密
          if (typeof v !== 'string') throw new BadRequestException(`字段 ${f.name} 必须是字符串`);
          break;
        case FieldType.Relation:
          if (f.relationType === 'connects') {
            if (!Array.isArray(v)) throw new BadRequestException(`字段 ${f.name} 必须是数组`);
          } else {
            if (!Types.ObjectId.isValid(String(v))) {
              throw new BadRequestException(`字段 ${f.name} 必须是 ObjectId`);
            }
          }
          break;
        case FieldType.String:
        default:
          if (typeof v !== 'string') throw new BadRequestException(`字段 ${f.name} 必须是字符串`);
          if (f.regex) {
            const re = new RegExp(f.regex);
            if (!re.test(String(v))) {
              throw new BadRequestException(`字段 ${f.name} 不符合正则 ${f.regex}`);
            }
          }
          if (f.uid === 'uid' && (v as string).length > 64) {
            throw new BadRequestException('uid 最长 64 字符');
          }
      }
    }
  }

  /** 列表 / 详情 / 更新返回时，把密文字段标记为 'enc:...'（不脱敏，原值是密文） */
  private maskPasswords(doc: any, def: ModelDef) {
    if (!doc) return doc;
    const pwFields = (def.fields ?? []).filter((f) => f.type === FieldType.Password).map((f) => f.uid);
    for (const f of pwFields) {
      if (doc[f] && typeof doc[f] === 'string' && doc[f].startsWith('enc:')) {
        // 对外只显示前缀 + 长度
        doc[`${f}_masked`] = true;
        doc[f] = `enc:${'•'.repeat(8)}`;
      }
    }
    return doc;
  }
}
