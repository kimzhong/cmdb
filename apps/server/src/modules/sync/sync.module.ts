import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { SyncTask, SyncTaskSchema, SyncLog, SyncLogSchema } from './schemas/sync.schema';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { MockProvider } from './providers/mock.provider';
import { WebhookNotifier } from './notifier/webhook.notifier';
import { ModelsModule } from '../meta-model/models/models.module';
import { ResourcesModule } from '../resources/resources.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: SyncTask.name, schema: SyncTaskSchema },
      { name: SyncLog.name, schema: SyncLogSchema },
    ]),
    ModelsModule,
    ResourcesModule,
  ],
  controllers: [SyncController],
  providers: [SyncService, MockProvider, WebhookNotifier],
  exports: [SyncService],
})
export class SyncModule {}
