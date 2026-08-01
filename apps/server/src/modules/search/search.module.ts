import { Module } from '@nestjs/common';
import { ModelsModule } from '../meta-model/models/models.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [ModelsModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
