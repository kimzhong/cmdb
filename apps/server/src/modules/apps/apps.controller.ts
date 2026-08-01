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
import { AppsService } from './apps.service';
import { CreateAppDto, CreateBizDto, BindAppResourcesDto } from './dto/app.dto';

@ApiTags('apps')
@Controller('apps')
export class AppsController {
  constructor(private readonly service: AppsService) {}

  // ---- 业务 ----
  @Public()
  @Get('biz')
  @ApiOperation({ summary: '列出所有业务' })
  listBiz() {
    return this.service.listBiz();
  }

  @Post('biz')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '新建业务' })
  createBiz(@Body() dto: CreateBizDto) {
    return this.service.createBiz(dto);
  }

  @Delete('biz/:id')
  @ApiOperation({ summary: '删除业务（要求无应用）' })
  async removeBiz(@Param('id') id: string) {
    await this.service.removeBiz(id);
    return { id };
  }

  // ---- 应用 ----
  @Public()
  @Get('app')
  @ApiQuery({ name: 'bizId', required: false })
  @ApiOperation({ summary: '列出应用（可按业务过滤）' })
  listApp(@Query('bizId') bizId?: string) {
    return this.service.listApp(bizId);
  }

  @Public()
  @Get('app/:id')
  @ApiOperation({ summary: '应用详情' })
  detailApp(@Param('id') id: string) {
    return this.service.findApp(id);
  }

  @Post('app')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '新建应用' })
  createApp(@Body() dto: CreateAppDto) {
    return this.service.createApp(dto);
  }

  @Delete('app/:id')
  @ApiOperation({ summary: '删除应用（级联解除资源绑定）' })
  async removeApp(@Param('id') id: string) {
    await this.service.removeApp(id);
    return { id };
  }

  // ---- 应用 ↔ 资源 ----
  @Post('app/:id/resources')
  @ApiOperation({ summary: '绑定资源到应用' })
  bind(@Param('id') id: string, @Body() dto: BindAppResourcesDto) {
    return this.service.bindResources(id, dto);
  }

  @Delete('app/:id/resources')
  @ApiOperation({ summary: '解除资源绑定' })
  async unbind(
    @Param('id') id: string,
    @Query('modelUid') modelUid: string,
    @Query('resourceId') resourceId: string,
  ) {
    await this.service.unbindResource(id, modelUid, resourceId);
    return { id, modelUid, resourceId };
  }

  @Public()
  @Get('app/:id/resources')
  @ApiOperation({ summary: '应用关联的资源（按 modelUid 分组），env 可选过滤 environment 标签' })
  @ApiQuery({ name: 'env', required: false, description: 'prod / pre / test' })
  @ApiQuery({ name: 'modelUid', required: false })
  resources(
    @Param('id') id: string,
    @Query('env') env?: string,
    @Query('modelUid') modelUid?: string,
  ) {
    return this.service.appResources(id, { env, modelUid });
  }
}
