/**
 * Discovery 限界上下文 (F7)
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscoveryTask, DiscoveryTaskSchema } from './infra/discovery-task.schema';
import { DiscoveryRun, DiscoveryRunSchema } from './infra/discovery-run.schema';
import { DiscoveryService } from './application/discovery.service';
import { DiscoveryController } from './application/discovery.controller';
import { ModelsModule } from '../meta-model/models/models.module';
import { ResourcesModule } from '../resources/resources.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DiscoveryTask.name, schema: DiscoveryTaskSchema },
      { name: DiscoveryRun.name, schema: DiscoveryRunSchema },
    ]),
    ModelsModule,
    ResourcesModule,
  ],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
