import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Biz, BizSchema, App, AppSchema, AppResourceBinding, AppResourceBindingSchema } from './schemas/app.schema';
import { TagBinding, TagBindingSchema } from '../tags/schemas/tag.schema';
import { AppsController } from './apps.controller';
import { AppsService } from './apps.service';
import { ModelsModule } from '../meta-model/models/models.module';
import { TagsModule } from '../tags/tags.module';
import { ResourcesModule } from '../resources/resources.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Biz.name, schema: BizSchema },
      { name: App.name, schema: AppSchema },
      { name: AppResourceBinding.name, schema: AppResourceBindingSchema },
      { name: TagBinding.name, schema: TagBindingSchema },
    ]),
    ModelsModule,
    TagsModule,
    ResourcesModule,
  ],
  controllers: [AppsController],
  providers: [AppsService],
  exports: [AppsService],
})
export class AppsModule {}
