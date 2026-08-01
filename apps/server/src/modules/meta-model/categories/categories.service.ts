import { Injectable, NotFoundException, OnModuleInit, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument, BUILTIN_CATEGORIES } from './schemas/category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  /** 模块启动时初始化 4 个内置分类 */
  async onModuleInit() {
    for (const c of BUILTIN_CATEGORIES) {
      await this.categoryModel.updateOne(
        { uid: c.uid },
        { $setOnInsert: c },
        { upsert: true },
      );
    }
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const exists = await this.categoryModel.findOne({ uid: dto.uid }).lean();
    if (exists) {
      throw new ConflictException(`分类 uid=${dto.uid} 已存在`);
    }
    const created = await this.categoryModel.create(dto);
    return created.toObject();
  }

  async findAll(): Promise<Category[]> {
    return this.categoryModel.find().sort({ order: 1, createdAt: 1 }).lean();
  }

  async findOne(id: string): Promise<Category> {
    const found = await this.categoryModel.findById(id).lean();
    if (!found) throw new NotFoundException(`分类 ${id} 不存在`);
    return found;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const found = await this.categoryModel.findById(id);
    if (!found) throw new NotFoundException(`分类 ${id} 不存在`);
    if (found.builtin && dto.builtin === false) {
      throw new BadRequestException('内置分类不可取消内置标识');
    }
    Object.assign(found, dto);
    await found.save();
    return found.toObject();
  }

  async remove(id: string): Promise<void> {
    const found = await this.categoryModel.findById(id);
    if (!found) throw new NotFoundException(`分类 ${id} 不存在`);
    if (found.builtin) {
      throw new BadRequestException('内置分类不可删除');
    }
    await found.deleteOne();
  }
}
