import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { TagsService } from './tags.service';
import { CreateTagKeyDto, CreateTagValueDto, BindResourcesDto } from './dto/tag.dto';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly service: TagsService) {}

  // ---- 标签键 ----
  @Public()
  @Get('keys')
  @ApiOperation({ summary: '列出所有标签键' })
  listKeys() {
    return this.service.listKeys();
  }

  @Post('keys')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '新建标签键' })
  createKey(@Body() dto: CreateTagKeyDto) {
    return this.service.createKey(dto);
  }

  @Delete('keys/:id')
  @ApiOperation({ summary: '删除标签键（要求无值）' })
  async removeKey(@Param('id') id: string) {
    await this.service.removeKey(id);
    return { id };
  }

  // ---- 标签值 ----
  @Public()
  @Get('values')
  @ApiQuery({ name: 'keyId', required: false })
  @ApiOperation({ summary: '列出标签值（可选按 keyId 过滤）' })
  listValues(@Query('keyId') keyId?: string) {
    return this.service.listValues(keyId);
  }

  @Post('values')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '新建标签值' })
  createValue(@Body() dto: CreateTagValueDto) {
    return this.service.createValue(dto);
  }

  @Delete('values/:id')
  @ApiOperation({ summary: '删除标签值（要求未绑定）' })
  async removeValue(@Param('id') id: string) {
    await this.service.removeValue(id);
    return { id };
  }

  // ---- 资源绑定 ----
  @Post('values/:id/bind')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '把标签值绑定到多个资源' })
  bind(@Param('id') id: string, @Body() dto: BindResourcesDto) {
    return this.service.bindResources(id, dto);
  }

  @Delete('values/:id/bind')
  @ApiOperation({ summary: '解绑单个资源' })
  async unbind(
    @Param('id') id: string,
    @Query('modelUid') modelUid: string,
    @Query('resourceId') resourceId: string,
  ) {
    await this.service.unbindResource(id, modelUid, resourceId);
    return { id, modelUid, resourceId };
  }

  @Public()
  @Get('resource-tags')
  @ApiOperation({ summary: '取一个资源身上的所有标签（含键名）' })
  @ApiQuery({ name: 'modelUid' })
  @ApiQuery({ name: 'resourceId' })
  getResourceTags(
    @Query('modelUid') modelUid: string,
    @Query('resourceId') resourceId: string,
  ) {
    return this.service.getResourceTags(modelUid, resourceId);
  }

  // ---- 标签搜索 ----
  @Public()
  @Post('search')
  @ApiOperation({ summary: '按标签组合搜索资源（AND 语义），结果按模型分栏' })
  search(@Body() body: { tagValueIds: string[]; modelUid?: string }) {
    return this.service.searchByTags(body);
  }
}
