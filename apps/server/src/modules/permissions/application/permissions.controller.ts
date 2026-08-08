import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @Get()
  list(@Query('subjectType') subjectType?: string, @Query('subjectId') subjectId?: string) {
    return this.service.list({ subjectType, subjectId });
  }

  @Post()
  grant(@Body() dto: any) { return this.service.grant(dto); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }

  @Delete(':id')
  async revoke(@Param('id') id: string) { await this.service.revoke(id); }

  @Post('check')
  check(@Body() dto: any) {
    return this.service.check(dto.user, dto.action, dto.target);
  }
}
