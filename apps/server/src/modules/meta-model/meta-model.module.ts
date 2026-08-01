import { Module } from '@nestjs/common';
import { CategoriesModule } from './categories/categories.module';
import { ModelGroupsModule } from './model-groups/model-groups.module';
import { ModelsModule } from './models/models.module';

@Module({
  imports: [CategoriesModule, ModelGroupsModule, ModelsModule],
})
export class MetaModelModule {}
