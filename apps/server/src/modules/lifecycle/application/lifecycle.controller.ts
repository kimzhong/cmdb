/**
 * Lifecycle REST 控制器
 * 提供 transition / restore / nextStates / purge 接口
 */
import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { LifecycleState } from '@cmdb/shared/types';
import { ResourcesLifecycleService, TransitionDto } from './resources-lifecycle.service';

@Controller('api/resources')
export class LifecycleController {
  constructor(private readonly service: ResourcesLifecycleService) {}

  @Get(':modelUid/:id/lifecycle/next-states')
  nextStates(@Param('modelUid') modelUid: string, @Param('id') id: string) {
    return this.service.nextStates(modelUid, id);
  }

  @Post(':modelUid/:id/lifecycle/transition')
  transition(
    @Param('modelUid') modelUid: string,
    @Param('id') id: string,
    @Body() dto: { to: LifecycleState; reason?: string; actor: string },
  ) {
    return this.service.transition(modelUid, id, dto);
  }

  @Post(':modelUid/:id/restore')
  restore(
    @Param('modelUid') modelUid: string,
    @Param('id') id: string,
    @Body() dto: { actor: string },
  ) {
    return this.service.restore(modelUid, id, dto.actor);
  }

  @Delete(':modelUid/:id/purge')
  @HttpCode(204)
  async purge(@Param('modelUid') modelUid: string, @Param('id') id: string) {
    await this.service.purge(modelUid, id);
  }
}
