/**
 * Lifecycle 限界上下文 (F3 + F4)
 *
 * 责任:
 *  - 资源生命周期状态机
 *  - 软删除 (deleted 状态)
 *  - 回收站 (列表 + 恢复)
 *  - 物理删除 (purge, 仅 admin)
 *
 * 上下游:
 *  - 嵌入 resources (lifecycle 字段)
 *  - 接收 approval.approved 事件(自动执行)
 */
import { Module } from '@nestjs/common';
import { ModelsModule } from '../meta-model/models/models.module';
import { ResourcesModule } from '../resources/resources.module';
import { LifecycleService } from './domain/lifecycle.service';
import { ResourcesLifecycleService } from './application/resources-lifecycle.service';
import { LifecycleController } from './application/lifecycle.controller';
import { TrashController } from './application/trash.controller';

@Module({
  imports: [ModelsModule, ResourcesModule],
  controllers: [LifecycleController, TrashController],
  providers: [LifecycleService, ResourcesLifecycleService],
  exports: [LifecycleService, ResourcesLifecycleService],
})
export class LifecycleModule {}
