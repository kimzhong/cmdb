import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModelDef, ModelSchema } from './schemas/model.schema';
import { ModelsController } from './models.controller';
import { ModelsService } from './models.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: ModelDef.name, schema: ModelSchema }])],
  controllers: [ModelsController],
  providers: [ModelsService],
  exports: [ModelsService],
})
export class ModelsModule {}
