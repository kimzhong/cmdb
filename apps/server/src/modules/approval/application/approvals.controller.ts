/**
 * Approvals REST 控制器
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApprovalsService, CreateApprovalDto } from './approvals.service';

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly service: ApprovalsService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('requesterId') requesterId?: string,
    @Query('type') type?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('mine') mine?: string,
  ) {
    return this.service.list({
      status,
      requesterId,
      type,
      targetType,
      targetId,
      mine: mine === 'true',
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateApprovalDto) {
    return this.service.create(dto);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: { approverId: string; approverName: string; comment: string },
  ) {
    return this.service.approve(id, dto.approverId, dto.approverName, dto.comment ?? '');
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: { approverId: string; approverName: string; comment: string },
  ) {
    return this.service.reject(id, dto.approverId, dto.approverName, dto.comment ?? '');
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: { actorId: string }) {
    return this.service.cancel(id, dto.actorId);
  }

  @Post(':id/apply')
  apply(@Param('id') id: string, @Body() dto: { success: boolean; error?: string }) {
    return this.service.markApplied(id, { success: dto.success, error: dto.error });
  }
}
