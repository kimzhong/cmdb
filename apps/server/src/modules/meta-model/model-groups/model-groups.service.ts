import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ModelGroup, ModelGroupDocument } from './schemas/model-group.schema';
import { CreateModelGroupDto } from './dto/create-model-group.dto';

@Injectable()
export class ModelGroupsService {
  constructor(
    @InjectModel(ModelGroup.name) private readonly model: Model<ModelGroupDocument>,
  ) {}

  async create(dto: CreateModelGroupDto): Promise<ModelGroup> {
    const exists = await this.model.findOne({ uid: dto.uid }).lean();
    if (exists) throw new ConflictException(`模型分组 uid=${dto.uid} 已存在`);

    const created = await this.model.create({
      ...dto,
      categoryId: new Types.ObjectId(dto.categoryId),
    });
    return created.toObject();
  }

  async findAll(categoryId?: string): Promise<ModelGroup[]> {
    const filter: Record<string, unknown> = {};
    if (categoryId) {
      if (!Types.ObjectId.isValid(categoryId)) {
        throw new BadRequestException('categoryId 非法');
      }
      filter.categoryId = new Types.ObjectId(categoryId);
    }
    return this.model.find(filter).sort({ order: 1, createdAt: 1 }).lean();
  }

  async findOne(id: string): Promise<ModelGroup> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const found = await this.model.findById(id).lean();
    if (!found) throw new NotFoundException(`模型分组 ${id} 不存在`);
    return found;
  }

  async update(id: string, dto: Partial<CreateModelGroupDto>): Promise<ModelGroup> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const found = await this.model.findById(id);
    if (!found) throw new NotFoundException(`模型分组 ${id} 不存在`);
    if (dto.categoryId) {
      found.categoryId = new Types.ObjectId(dto.categoryId);
    }
    if (dto.uid !== undefined) found.uid = dto.uid;
    if (dto.name !== undefined) found.name = dto.name;
    if (dto.order !== undefined) found.order = dto.order;
    await found.save();
    return found.toObject();
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const found = await this.model.findById(id);
    if (!found) throw new NotFoundException(`模型分组 ${id} 不存在`);
    await found.deleteOne();
  }
}
