import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Biz, BizDocument, App, AppDocument, AppResourceBinding, AppResourceBindingDocument } from './schemas/app.schema';
import { CreateAppDto, CreateBizDto, BindAppResourcesDto } from './dto/app.dto';
import { ModelsService } from '../meta-model/models/models.service';
import { TagsService } from '../tags/tags.service';
import { DynamicSchemaFactory } from '../resources/dynamic-schema.factory';
import { TagBinding, TagBindingDocument } from '../tags/schemas/tag.schema';

@Injectable()
export class AppsService {
  constructor(
    @InjectModel(Biz.name) private readonly bizModel: Model<BizDocument>,
    @InjectModel(App.name) private readonly appModel: Model<AppDocument>,
    @InjectModel(AppResourceBinding.name) private readonly bindingModel: Model<AppResourceBindingDocument>,
    @InjectModel(TagBinding.name) private readonly tagBindingModel: Model<TagBindingDocument>,
    private readonly modelsService: ModelsService,
    private readonly tagsService: TagsService,
    private readonly dynamicFactory: DynamicSchemaFactory,
  ) {}

  // ---- 业务 ----
  async createBiz(dto: CreateBizDto): Promise<Biz> {
    const exists = await this.bizModel.findOne({ uid: dto.uid }).lean();
    if (exists) throw new ConflictException(`业务 uid=${dto.uid} 已存在`);
    const c = await this.bizModel.create(dto);
    return c.toObject();
  }

  async listBiz(): Promise<Biz[]> {
    return this.bizModel.find().sort({ order: 1, createdAt: 1 }).lean();
  }

  async removeBiz(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const oid = new Types.ObjectId(id);
    const appCount = await this.appModel.countDocuments({ bizId: oid });
    if (appCount > 0) throw new BadRequestException('该业务下还有应用，请先迁移');
    await this.bizModel.deleteOne({ _id: oid });
  }

  // ---- 应用 ----
  async createApp(dto: CreateAppDto): Promise<App> {
    if (!Types.ObjectId.isValid(dto.bizId)) throw new BadRequestException('bizId 非法');
    const exists = await this.appModel.findOne({ uid: dto.uid }).lean();
    if (exists) throw new ConflictException(`应用 uid=${dto.uid} 已存在`);
    const c = await this.appModel.create({
      ...dto,
      bizId: new Types.ObjectId(dto.bizId),
    });
    return c.toObject();
  }

  async findApp(id: string): Promise<App> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const found = await this.appModel.findById(id).lean();
    if (!found) throw new NotFoundException(`应用 ${id} 不存在`);
    return found;
  }

  async listApp(bizId?: string): Promise<App[]> {
    const filter: Record<string, unknown> = {};
    if (bizId) {
      if (!Types.ObjectId.isValid(bizId)) throw new BadRequestException('bizId 非法');
      filter.bizId = new Types.ObjectId(bizId);
    }
    return this.appModel.find(filter).sort({ createdAt: 1 }).lean();
  }

  async removeApp(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const oid = new Types.ObjectId(id);
    await this.bindingModel.deleteMany({ appId: oid });
    await this.appModel.deleteOne({ _id: oid });
  }

  // ---- 资源绑定 ----
  async bindResources(appId: string, dto: BindAppResourcesDto): Promise<{ bound: number }> {
    if (!Types.ObjectId.isValid(appId)) throw new BadRequestException('appId 非法');
    const appOid = new Types.ObjectId(appId);
    for (const r of dto.resources) {
      await this.modelsService.findByUid(r.modelUid);
      if (!Types.ObjectId.isValid(r.resourceId)) throw new BadRequestException(`resourceId 非法`);
    }
    const ops = dto.resources.map((r) => ({
      updateOne: {
        filter: { appId: appOid, modelUid: r.modelUid, resourceId: new Types.ObjectId(r.resourceId) },
        update: {
          $setOnInsert: { appId: appOid, modelUid: r.modelUid, resourceId: new Types.ObjectId(r.resourceId) },
        },
        upsert: true,
      },
    }));
    if (ops.length === 0) return { bound: 0 };
    await this.bindingModel.bulkWrite(ops as never);
    return { bound: ops.length };
  }

  async unbindResource(appId: string, modelUid: string, resourceId: string): Promise<void> {
    if (!Types.ObjectId.isValid(appId)) throw new BadRequestException('appId 非法');
    if (!Types.ObjectId.isValid(resourceId)) throw new BadRequestException('resourceId 非法');
    await this.bindingModel.deleteOne({
      appId: new Types.ObjectId(appId),
      modelUid,
      resourceId: new Types.ObjectId(resourceId),
    });
  }

  /**
   * 应用详情：按 modelUid 分组返回关联资源。
   * env 参数：按 environment 标签值过滤（值形如 prod / pre / test）
   */
  async appResources(
    appId: string,
    opts: { env?: string; modelUid?: string } = {},
  ): Promise<{
    app: App;
    byModel: Array<{ modelUid: string; resources: Array<Record<string, unknown>> }>;
  }> {
    const app = await this.findApp(appId);
    const filter: Record<string, unknown> = { appId: new Types.ObjectId(appId) };
    if (opts.modelUid) filter.modelUid = opts.modelUid;
    const bindings = await this.bindingModel.find(filter).lean();
    if (bindings.length === 0) return { app, byModel: [] };

    const groups = new Map<string, Types.ObjectId[]>();
    for (const b of bindings) {
      if (!groups.has(b.modelUid)) groups.set(b.modelUid, []);
      groups.get(b.modelUid)!.push(b.resourceId);
    }

    // 解析 env 标签值
    let envValueId: Types.ObjectId | undefined;
    if (opts.env) {
      const envKeyRaw = (await this.tagsService.findKeyByUid('environment')) as unknown as { _id: Types.ObjectId };
      const envValuesRaw = (await this.tagsService.listValues(envKeyRaw._id.toString())) as Array<unknown>;
      const v = envValuesRaw.find((vv) => (vv as { value: string }).value === opts.env) as unknown as { _id: Types.ObjectId } | undefined;
      if (v) envValueId = v._id;
    }

    const byModel: Array<{ modelUid: string; resources: Array<Record<string, unknown>> }> = [];
    for (const [m, ids] of groups) {
      const def = await this.modelsService.findByUid(m);
      const M = await this.dynamicFactory.getModelFor(def);
      let docs = (await M.find({ _id: { $in: ids } }).lean()) as Array<Record<string, unknown>>;

      if (envValueId) {
        const envBindings = await this.tagBindingModel
          .find({ tagValueId: envValueId, modelUid: m, resourceId: { $in: ids } })
          .lean();
        const okIds = new Set(envBindings.map((b) => b.resourceId.toString()));
        docs = docs.filter((d) => okIds.has(String(d._id)));
      }

      byModel.push({ modelUid: m, resources: docs });
    }
    return { app, byModel };
  }
}
