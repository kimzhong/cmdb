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
import { ModelGroupsService } from './model-groups.service';
import { CreateModelGroupDto } from './dto/create-model-group.dto';

@ApiTags('meta-model/model-groups')
@Controller('meta-model/model-groups')
export class ModelGroupsController {
  constructor(private readonly service: ModelGroupsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '获取模型分组列表' })
  @ApiQuery({ name: 'categoryId', required: false })
  list(@Query('categoryId') categoryId?: string) {
    return this.service.findAll(categoryId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '获取单个模型分组' })
  detail(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '新建模型分组' })
  create(@Body() dto: CreateModelGroupDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新模型分组' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateModelGroupDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除模型分组' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { id };
  }
}
