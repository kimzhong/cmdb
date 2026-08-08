/**
 * Model-Templates 限界上下文 (F12)
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModelTemplate, ModelTemplateSchema } from './infra/model-template.schema';
import { ModelTemplatesService } from './application/model-templates.service';
import { ModelTemplatesController } from './application/model-templates.controller';
import { ModelsModule } from '../meta-model/models/models.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ModelTemplate.name, schema: ModelTemplateSchema }]),
    ModelsModule,
  ],
  controllers: [ModelTemplatesController],
  providers: [ModelTemplatesService],
  exports: [ModelTemplatesService],
})
export class ModelTemplatesModule {}
