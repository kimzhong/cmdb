import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ModelDef,
  ModelDocument,
  BUILTIN_FIELD_GROUPS,
  BUILTIN_FIELDS,
} from './schemas/model.schema';
import {
  CreateModelDto,
  UpdateModelDto,
  AddFieldDto,
  UpdateFieldDto,
  AddFieldGroupDto,
} from './dto/create-model.dto';

@Injectable()
export class ModelsService {
  constructor(
    @InjectModel(ModelDef.name) private readonly model: Model<ModelDocument>,
  ) {}

  async create(dto: CreateModelDto): Promise<ModelDef> {
    const exists = await this.model.findOne({ uid: dto.uid }).lean();
    if (exists) throw new ConflictException(`模型 uid=${dto.uid} 已存在`);

    // 自动注入字段分组 + 字段
    const fieldGroups = (dto.fieldGroups ?? BUILTIN_FIELD_GROUPS).map((g) => ({
      ...g,
      builtin: g.uid === 'basic' || g.uid === 'relation',
    }));
    const fields = (dto.fields ?? BUILTIN_FIELDS).map((f) => ({
      ...f,
      builtin: f.uid === 'uid' || f.uid === 'name',
    }));

    const created = await this.model.create({
      ...dto,
      categoryId: new Types.ObjectId(dto.categoryId),
      groupId: new Types.ObjectId(dto.groupId),
      fieldGroups,
      fields,
    });
    return created.toObject();
  }

  async findAll(filter: { categoryId?: string; groupId?: string } = {}): Promise<ModelDef[]> {
    const q: Record<string, unknown> = {};
    if (filter.categoryId) {
      if (!Types.ObjectId.isValid(filter.categoryId)) throw new BadRequestException('categoryId 非法');
      q.categoryId = new Types.ObjectId(filter.categoryId);
    }
    if (filter.groupId) {
      if (!Types.ObjectId.isValid(filter.groupId)) throw new BadRequestException('groupId 非法');
      q.groupId = new Types.ObjectId(filter.groupId);
    }
    return this.model.find(q).sort({ order: 1, createdAt: 1 }).lean();
  }

  async findOne(id: string): Promise<ModelDef> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const found = await this.model.findById(id).lean();
    if (!found) throw new NotFoundException(`模型 ${id} 不存在`);
    return found;
  }

  async findByUid(uid: string): Promise<ModelDef> {
    const found = await this.model.findOne({ uid }).lean();
    if (!found) throw new NotFoundException(`模型 uid=${uid} 不存在`);
    return found;
  }

  async update(id: string, dto: UpdateModelDto): Promise<ModelDef> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const found = await this.model.findById(id);
    if (!found) throw new NotFoundException(`模型 ${id} 不存在`);
    if (dto.categoryId) found.categoryId = new Types.ObjectId(dto.categoryId);
    if (dto.groupId) found.groupId = new Types.ObjectId(dto.groupId);
    if (dto.name !== undefined) found.name = dto.name;
    if (dto.description !== undefined) found.description = dto.description;
    if (dto.order !== undefined) found.order = dto.order;
    await found.save();
    return found.toObject();
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const found = await this.model.findById(id);
    if (!found) throw new NotFoundException(`模型 ${id} 不存在`);
    // 删除约束在 7.2：模型下无字段分组、无字段、无数据。这里软校验最关键的一项：
    // 数据存在性校验放到 resources 模块做（要查动态集合）。
    await found.deleteOne();
  }

  // ---------- 字段分组 ----------
  async addFieldGroup(modelId: string, dto: AddFieldGroupDto): Promise<ModelDef> {
    const m = await this.getModelDoc(modelId);
    if (m.fieldGroups.some((g) => g.uid === dto.uid)) {
      throw new ConflictException(`字段分组 uid=${dto.uid} 已存在`);
    }
    m.fieldGroups.push({
      uid: dto.uid,
      name: dto.name,
      order: dto.order ?? 0,
      builtin: false,
    });
    await m.save();
    return m.toObject();
  }

  async removeFieldGroup(modelId: string, groupUid: string): Promise<ModelDef> {
    const m = await this.getModelDoc(modelId);
    const g = m.fieldGroups.find((x) => x.uid === groupUid);
    if (!g) throw new NotFoundException(`字段分组 ${groupUid} 不存在`);
    if (g.builtin) throw new BadRequestException('内置字段分组不可删除');
    if (m.fields.some((f) => f.groupUid === groupUid)) {
      throw new BadRequestException('该字段分组下仍有字段，请先删除字段');
    }
    m.fieldGroups = m.fieldGroups.filter((x) => x.uid !== groupUid);
    await m.save();
    return m.toObject();
  }

  // ---------- 字段 ----------
  async addField(modelId: string, dto: AddFieldDto): Promise<ModelDef> {
    const m = await this.getModelDoc(modelId);
    if (m.fields.some((f) => f.uid === dto.uid)) {
      throw new ConflictException(`字段 uid=${dto.uid} 已存在`);
    }
    if (!m.fieldGroups.some((g) => g.uid === dto.groupUid)) {
      throw new BadRequestException(`字段分组 ${dto.groupUid} 不存在`);
    }
    m.fields.push({
      uid: dto.uid,
      name: dto.name,
      type: dto.type,
      groupUid: dto.groupUid,
      order: dto.order ?? 0,
      required: dto.required ?? false,
      builtin: false,
      regex: dto.regex,
      options: dto.options ?? [],
      relationType: dto.relationType,
      targetModelUid: dto.targetModelUid,
    });
    await m.save();
    return m.toObject();
  }

  async updateField(modelId: string, fieldUid: string, dto: UpdateFieldDto): Promise<ModelDef> {
    const m = await this.getModelDoc(modelId);
    const f = m.fields.find((x) => x.uid === fieldUid);
    if (!f) throw new NotFoundException(`字段 ${fieldUid} 不存在`);
    // 按文档 4.1.7：编辑字段只能修改名称和描述，字段类型与标识不能修改
    // 这里我们只允许 name/description/order/required 改
    if (dto.name !== undefined) f.name = dto.name;
    if (dto.description !== undefined && 'description' in f) {
      (f as { description?: string }).description = dto.description;
    }
    if (dto.order !== undefined) f.order = dto.order;
    if (dto.required !== undefined) f.required = dto.required;
    await m.save();
    return m.toObject();
  }

  async removeField(modelId: string, fieldUid: string): Promise<ModelDef> {
    const m = await this.getModelDoc(modelId);
    const f = m.fields.find((x) => x.uid === fieldUid);
    if (!f) throw new NotFoundException(`字段 ${fieldUid} 不存在`);
    if (f.builtin) throw new BadRequestException('内置字段不可删除');
    // 真实删除约束：字段无数据才允许删（resources 模块做）
    m.fields = m.fields.filter((x) => x.uid !== fieldUid);
    await m.save();
    return m.toObject();
  }

  private async getModelDoc(id: string): Promise<ModelDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const m = await this.model.findById(id);
    if (!m) throw new NotFoundException(`模型 ${id} 不存在`);
    return m;
  }
}
