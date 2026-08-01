import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ResourcesService } from './resources.service';

@ApiTags('resources')
@Controller('resources/:modelUid')
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '资源列表（按模型 uid）' })
  @ApiParam({ name: 'modelUid' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  list(
    @Param('modelUid') modelUid: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.service.list(modelUid, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      keyword,
    });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '资源详情' })
  detail(@Param('modelUid') modelUid: string, @Param('id') id: string) {
    return this.service.detail(modelUid, id);
  }

  @Post()
  @ApiOperation({ summary: '新建资源' })
  create(@Param('modelUid') modelUid: string, @Body() body: Record<string, unknown>) {
    return this.service.create(modelUid, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新资源' })
  update(
    @Param('modelUid') modelUid: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.update(modelUid, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除资源' })
  async remove(@Param('modelUid') modelUid: string, @Param('id') id: string) {
    await this.service.remove(modelUid, id);
    return { id };
  }

  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除' })
  batchRemove(@Param('modelUid') modelUid: string, @Body() body: { ids: string[] }) {
    return this.service.batchRemove(modelUid, body.ids ?? []);
  }
}
