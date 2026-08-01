import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModelGroup, ModelGroupSchema } from './schemas/model-group.schema';
import { ModelGroupsController } from './model-groups.controller';
import { ModelGroupsService } from './model-groups.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: ModelGroup.name, schema: ModelGroupSchema }])],
  controllers: [ModelGroupsController],
  providers: [ModelGroupsService],
  exports: [ModelGroupsService],
})
export class ModelGroupsModule {}
