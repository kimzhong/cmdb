import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: '全局搜索（基于 MongoDB 全文索引）',
    description: '语法：空格=AND；/a/b=OR；-word=排除',
  })
  @ApiQuery({ name: 'keyword', required: true })
  @ApiQuery({ name: 'modelUid', required: false })
  @ApiQuery({ name: 'limit', required: false })
  search(
    @Query('keyword') keyword: string,
    @Query('modelUid') modelUid?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.globalSearch({ keyword, modelUid, limit: limit ? Number(limit) : undefined });
  }
}
