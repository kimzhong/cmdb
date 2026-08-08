import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';

@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly service: DiscoveryService) {}

  @Get('tasks')
  listTasks(@Query('protocol') protocol?: string, @Query('enabled') enabled?: string) {
    return this.service.listTasks({
      protocol,
      enabled: enabled === undefined ? undefined : enabled === 'true',
    });
  }

  @Post('tasks')
  createTask(@Body() body: any) {
    return this.service.createTask(body);
  }

  @Get('tasks/:id')
  async getTask(@Param('id') id: string) {
    const list = await this.service.listTasks();
    return list.find((t: any) => t.id === id);
  }

  @Put('tasks/:id')
  updateTask(@Param('id') id: string, @Body() body: any) {
    return this.service.updateTask(id, body);
  }

  @Delete('tasks/:id')
  async removeTask(@Param('id') id: string) {
    await this.service.deleteTask(id);
  }

  @Post('tasks/:id/run')
  runTask(@Param('id') id: string) {
    return this.service.runTask(id, 'manual');
  }

  @Get('tasks/:id/runs')
  listRuns(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.service.listRuns(id, limit ? parseInt(limit, 10) : 20);
  }

  @Get('runs/:runId')
  getRun(@Param('runId') runId: string) {
    return this.service.getRun(runId);
  }
}
