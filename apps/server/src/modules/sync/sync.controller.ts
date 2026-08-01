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
import { Public } from '../../common/decorators/public.decorator';
import { SyncService } from './sync.service';
import { CreateSyncTaskDto, UpdateSyncTaskDto } from './dto/sync.dto';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly service: SyncService) {}

  // ---- 任务 ----
  @Public()
  @Get('tasks')
  @ApiOperation({ summary: '列出所有同步任务' })
  listTasks() {
    return this.service.listTasks();
  }

  @Post('tasks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '新建同步任务（创建后立即按 cron 调度）' })
  createTask(@Body() dto: CreateSyncTaskDto) {
    return this.service.createTask(dto);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: '更新任务（重新调度）' })
  updateTask(@Param('id') id: string, @Body() dto: UpdateSyncTaskDto) {
    return this.service.updateTask(id, dto);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: '删除任务（取消调度）' })
  async removeTask(@Param('id') id: string) {
    await this.service.removeTask(id);
    return { id };
  }

  @Post('tasks/:id/trigger')
  @ApiOperation({ summary: '手动触发一次（不依赖 cron）' })
  async trigger(@Param('id') id: string) {
    return this.service.trigger(id);
  }

  // ---- 日志 ----
  @Public()
  @Get('logs')
  @ApiOperation({ summary: '查询同步日志' })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  logs(
    @Query('taskId') taskId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listLogs({
      taskId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
