import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TagKey, TagKeySchema, TagValue, TagValueSchema, TagBinding, TagBindingSchema } from './schemas/tag.schema';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { ModelsModule } from '../meta-model/models/models.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TagKey.name, schema: TagKeySchema },
      { name: TagValue.name, schema: TagValueSchema },
      { name: TagBinding.name, schema: TagBindingSchema },
    ]),
    ModelsModule,
  ],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
