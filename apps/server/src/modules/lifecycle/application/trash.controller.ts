/**
 * Trash 回收站 API
 * 跨模型列出所有软删除的资源
 */
import { Controller, Get, Query } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ModelsService } from '../../meta-model/models/models.service';
import { DynamicSchemaFactory } from '../../resources/dynamic-schema.factory';
import { LifecycleState } from '@cmdb/shared/types';

@Controller('trash')
export class TrashController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly modelsService: ModelsService,
    private readonly factory: DynamicSchemaFactory,
  ) {}

  /** 列出所有已软删除的资源 */
  @Get()
  async list(
    @Query('page') pageStr: string = '1',
    @Query('pageSize') pageSizeStr: string = '20',
    @Query('modelUid') modelUid?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(pageSizeStr, 10) || 20));

    const defs = modelUid
      ? [await this.modelsService.findByUid(modelUid)]
      : await this.modelsService.findAll();

    const all: any[] = [];
    for (const def of defs) {
      if (!def) continue;
      const M = await this.factory.getModelFor(def);
      const docs = await M.find({
        $or: [
          { 'lifecycle.state': LifecycleState.DELETED },
          { deletedAt: { $ne: null } },
        ],
      })
        .sort({ deletedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean();
      for (const d of docs) {
        all.push({ ...d, modelUid: def.uid, modelName: def.name });
      }
    }
    all.sort((a, b) => (b.deletedAt?.getTime?.() ?? 0) - (a.deletedAt?.getTime?.() ?? 0));
    return { list: all, total: all.length, page, pageSize };
  }
}
