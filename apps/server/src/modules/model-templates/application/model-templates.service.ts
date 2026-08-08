/**
 * ModelTemplates 应用服务
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ModelTemplate, ModelTemplateDocument } from '../infra/model-template.schema';
import { ModelsService } from '../../meta-model/models/models.service';

@Injectable()
export class ModelTemplatesService {
  constructor(
    @InjectModel(ModelTemplate.name) private readonly model: Model<ModelTemplateDocument>,
    private readonly modelsService: ModelsService,
  ) {}

  async list() {
    const docs = await this.model.find().sort({ category: 1, code: 1 }).exec();
    return docs.map((d) => d.toObject());
  }

  async get(code: string) {
    const doc = await this.model.findOne({ code });
    if (!doc) throw new NotFoundException(`模板 ${code} 不存在`);
    return doc.toObject();
  }

  /** 把模板导入为用户模型 */
  async importAsModel(code: string, actor: string) {
    const tpl = await this.get(code);
    // 复用 models.service 创建
    const result = await this.modelsService.create({
      uid: tpl.code,
      name: tpl.name,
      description: `从模板 ${code} 导入`,
      fields: tpl.fields,
      // icon/category 扩展字段(若 models 支持)
    } as any);
    return result;
  }
}
