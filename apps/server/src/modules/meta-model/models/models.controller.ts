import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { ModelsService } from './models.service';
import {
  CreateModelDto,
  UpdateModelDto,
  AddFieldDto,
  UpdateFieldDto,
  AddFieldGroupDto,
} from './dto/create-model.dto';

@ApiTags('meta-model/models')
@Controller('meta-model/models')
export class ModelsController {
  constructor(private readonly service: ModelsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '获取模型列表' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  list(@Query('categoryId') categoryId?: string, @Query('groupId') groupId?: string) {
    return this.service.findAll({ categoryId, groupId });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '获取单个模型' })
  detail(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Public()
  @Get('uid/:uid')
  @ApiOperation({ summary: '按 uid 获取模型（前端动态加载）' })
  byUid(@Param('uid') uid: string) {
    return this.service.findByUid(uid);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '新建模型（自动注入 2 个字段分组 + uid/name 字段）' })
  create(@Body() dto: CreateModelDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新模型基础信息（name/description/order）' })
  update(@Param('id') id: string, @Body() dto: UpdateModelDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除模型' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { id };
  }

  // ---------- 字段分组 ----------
  @Post(':id/field-groups')
  @ApiOperation({ summary: '新增字段分组' })
  addFieldGroup(@Param('id') id: string, @Body() dto: AddFieldGroupDto) {
    return this.service.addFieldGroup(id, dto);
  }

  @Delete(':id/field-groups/:groupUid')
  @ApiOperation({ summary: '删除字段分组（要求分组下无字段）' })
  async removeFieldGroup(@Param('id') id: string, @Param('groupUid') groupUid: string) {
    await this.service.removeFieldGroup(id, groupUid);
    return { id, groupUid };
  }

  // ---------- 字段 ----------
  @Post(':id/fields')
  @ApiOperation({ summary: '新增字段' })
  addField(@Param('id') id: string, @Body() dto: AddFieldDto) {
    return this.service.addField(id, dto);
  }

  @Patch(':id/fields/:fieldUid')
  @ApiOperation({ summary: '更新字段（仅 name/description/order/required）' })
  updateField(
    @Param('id') id: string,
    @Param('fieldUid') fieldUid: string,
    @Body() dto: UpdateFieldDto,
  ) {
    return this.service.updateField(id, fieldUid, dto);
  }

  @Delete(':id/fields/:fieldUid')
  @ApiOperation({ summary: '删除字段（内置不可删）' })
  async removeField(@Param('id') id: string, @Param('fieldUid') fieldUid: string) {
    await this.service.removeField(id, fieldUid);
    return { id, fieldUid };
  }
}
