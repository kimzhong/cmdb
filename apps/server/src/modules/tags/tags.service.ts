import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TagKey,
  TagKeyDocument,
  TagValue,
  TagValueDocument,
  TagBinding,
  TagBindingDocument,
  BUILTIN_TAG_KEYS,
} from './schemas/tag.schema';
import {
  CreateTagKeyDto,
  CreateTagValueDto,
  BindResourcesDto,
} from './dto/tag.dto';
import { ModelsService } from '../meta-model/models/models.service';

@Injectable()
export class TagsService implements OnModuleInit {
  private readonly logger = new Logger(TagsService.name);

  constructor(
    @InjectModel(TagKey.name) private readonly keyModel: Model<TagKeyDocument>,
    @InjectModel(TagValue.name) private readonly valueModel: Model<TagValueDocument>,
    @InjectModel(TagBinding.name) private readonly bindingModel: Model<TagBindingDocument>,
    private readonly modelsService: ModelsService,
  ) {}

  async onModuleInit() {
    for (const k of BUILTIN_TAG_KEYS) {
      await this.keyModel.updateOne({ uid: k.uid }, { $setOnInsert: k }, { upsert: true });
    }
    this.logger.log('标签系统就绪（含内置 environment 键）');
  }

  // ---------------- 标签键 ----------------
  async createKey(dto: CreateTagKeyDto): Promise<TagKey> {
    const exists = await this.keyModel.findOne({ uid: dto.uid }).lean();
    if (exists) throw new ConflictException(`标签键 uid=${dto.uid} 已存在`);
    const created = await this.keyModel.create(dto);
    return created.toObject();
  }

  async listKeys(): Promise<TagKey[]> {
    return this.keyModel.find().sort({ createdAt: 1 }).lean();
  }

  async findKeyByUid(uid: string): Promise<TagKey> {
    const found = await this.keyModel.findOne({ uid }).lean();
    if (!found) throw new NotFoundException(`标签键 uid=${uid} 不存在`);
    return found;
  }

  async removeKey(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const v = await this.valueModel.countDocuments({ keyId: new Types.ObjectId(id) });
    if (v > 0) throw new BadRequestException('该键下还有标签值，请先删除');
    await this.keyModel.deleteOne({ _id: new Types.ObjectId(id) });
  }

  // ---------------- 标签值 ----------------
  async createValue(dto: CreateTagValueDto): Promise<TagValue> {
    if (!Types.ObjectId.isValid(dto.keyId)) throw new BadRequestException('keyId 非法');
    const keyId = new Types.ObjectId(dto.keyId);
    const exists = await this.valueModel.findOne({ keyId, value: dto.value }).lean();
    if (exists) throw new ConflictException(`值 ${dto.value} 已存在`);
    const created = await this.valueModel.create({ ...dto, keyId });
    return created.toObject();
  }

  async listValues(keyId?: string): Promise<TagValue[]> {
    const filter: Record<string, unknown> = {};
    if (keyId) {
      if (!Types.ObjectId.isValid(keyId)) throw new BadRequestException('keyId 非法');
      filter.keyId = new Types.ObjectId(keyId);
    }
    return this.valueModel.find(filter).sort({ createdAt: 1 }).lean();
  }

  async removeValue(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const oid = new Types.ObjectId(id);
    const bound = await this.bindingModel.countDocuments({ tagValueId: oid });
    if (bound > 0) throw new BadRequestException('该值已绑定资源，请先解绑');
    await this.valueModel.deleteOne({ _id: oid });
  }

  // ---------------- 资源绑定 ----------------
  async bindResources(valueId: string, dto: BindResourcesDto): Promise<{ bound: number }> {
    if (!Types.ObjectId.isValid(valueId)) throw new BadRequestException('valueId 非法');
    const tagValueId = new Types.ObjectId(valueId);

    // 校验所有 modelUid 都存在
    for (const r of dto.resources) {
      await this.modelsService.findByUid(r.modelUid);
      if (!Types.ObjectId.isValid(r.resourceId)) {
        throw new BadRequestException(`resourceId ${r.resourceId} 非法`);
      }
    }

    const ops = dto.resources.map((r) => ({
      updateOne: {
        filter: { tagValueId, modelUid: r.modelUid, resourceId: new Types.ObjectId(r.resourceId) },
        update: { $setOnInsert: { tagValueId, modelUid: r.modelUid, resourceId: new Types.ObjectId(r.resourceId) } },
        upsert: true,
      },
    }));
    if (ops.length === 0) return { bound: 0 };
    await this.bindingModel.bulkWrite(ops as never);
    return { bound: ops.length };
  }

  async unbindResource(valueId: string, modelUid: string, resourceId: string): Promise<void> {
    if (!Types.ObjectId.isValid(valueId)) throw new BadRequestException('valueId 非法');
    if (!Types.ObjectId.isValid(resourceId)) throw new BadRequestException('resourceId 非法');
    await this.bindingModel.deleteOne({
      tagValueId: new Types.ObjectId(valueId),
      modelUid,
      resourceId: new Types.ObjectId(resourceId),
    });
  }

  /** 取一个资源身上的所有标签值（含所属键名） */
  async getResourceTags(modelUid: string, resourceId: string): Promise<Array<{ value: TagValue; key: TagKey }>> {
    if (!Types.ObjectId.isValid(resourceId)) throw new BadRequestException('resourceId 非法');
    const bindings = await this.bindingModel
      .find({ modelUid, resourceId: new Types.ObjectId(resourceId) })
      .lean();
    if (bindings.length === 0) return [];
    const valueIds = bindings.map((b) => b.tagValueId);
    const values = await this.valueModel.find({ _id: { $in: valueIds } }).lean();
    const keyIds = [...new Set(values.map((v) => v.keyId.toString()))].map((k) => new Types.ObjectId(k));
    const keys = await this.keyModel.find({ _id: { $in: keyIds } }).lean();
    const keyMap = new Map(keys.map((k) => [k._id.toString(), k]));
    return values.map((v) => ({ value: v, key: keyMap.get(v.keyId.toString())! }));
  }

  // ---------------- 标签搜索 ----------------
  /**
   * 按标签组合查资源。
   * - tagValueIds: 必须同时拥有这些标签值（AND）
   * - modelUid: 可选，按模型过滤
   * - 返回按模型分栏的 { modelUid, resources: [...] }
   */
  async searchByTags(params: {
    tagValueIds: string[];
    modelUid?: string;
  }): Promise<Array<{ modelUid: string; resources: Array<{ _id: string; bindings: string[] }> }>> {
    if (!params.tagValueIds?.length) {
      throw new BadRequestException('至少传一个 tagValueId');
    }
    const valueIds = params.tagValueIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (valueIds.length === 0) throw new BadRequestException('tagValueIds 非法');

    // 对每个值分别查，再求交集（AND）
    const sets: Array<Set<string>> = [];
    for (const vid of valueIds) {
      const docs = await this.bindingModel.find({ tagValueId: vid }).lean();
      const set = new Set(docs.map((d) => `${d.modelUid}::${d.resourceId.toString()}`));
      sets.push(set);
    }
    let intersection = sets[0];
    for (let i = 1; i < sets.length; i++) {
      intersection = new Set([...intersection].filter((x) => sets[i].has(x)));
    }

    // 按 modelUid 分组
    const grouped = new Map<string, Set<string>>();
    for (const key of intersection) {
      const [m, r] = key.split('::');
      if (params.modelUid && m !== params.modelUid) continue;
      if (!grouped.has(m)) grouped.set(m, new Set());
      grouped.get(m)!.add(r);
    }

    // 关联每个值在每个资源上的 binding id（用于前端显示哪些值命中）
    const out: Array<{ modelUid: string; resources: Array<{ _id: string; bindings: string[] }> }> = [];
    for (const [m, rIds] of grouped) {
      const bindings = await this.bindingModel
        .find({ modelUid: m, resourceId: { $in: [...rIds].map((r) => new Types.ObjectId(r)) } })
        .lean();
      const byRes = new Map<string, string[]>();
      for (const b of bindings) {
        const rid = b.resourceId.toString();
        if (!byRes.has(rid)) byRes.set(rid, []);
        byRes.get(rid)!.push(b.tagValueId.toString());
      }
      out.push({
        modelUid: m,
        resources: [...rIds].map((rid) => ({ _id: rid, bindings: byRes.get(rid) ?? [] })),
      });
    }
    return out;
  }
}
