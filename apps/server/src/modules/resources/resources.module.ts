import { Module } from '@nestjs/common';
import { ModelsModule } from '../meta-model/models/models.module';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { DynamicSchemaFactory } from './dynamic-schema.factory';

@Module({
  imports: [ModelsModule],
  controllers: [ResourcesController],
  providers: [ResourcesService, DynamicSchemaFactory],
  exports: [ResourcesService, DynamicSchemaFactory],
})
export class ResourcesModule {}
