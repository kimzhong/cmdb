/**
 * Bulk-IO 限界上下文 (F6)
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportJob, ImportJobSchema } from './infra/import-job.schema';
import { ExportJob, ExportJobSchema } from './infra/export-job.schema';
import { BulkIoService } from './application/bulk-io.service';
import { BulkIoController } from './application/bulk-io.controller';
import { ModelsModule } from '../meta-model/models/models.module';
import { ResourcesModule } from '../resources/resources.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImportJob.name, schema: ImportJobSchema },
      { name: ExportJob.name, schema: ExportJobSchema },
    ]),
    ModelsModule,
    ResourcesModule,
  ],
  controllers: [BulkIoController],
  providers: [BulkIoService],
  exports: [BulkIoService],
})
export class BulkIoModule {}
