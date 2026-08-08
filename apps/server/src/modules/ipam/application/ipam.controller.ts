import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IpamService } from './ipam.service';

@Controller('ipam')
export class IpamController {
  constructor(private readonly service: IpamService) {}

  @Get('subnets')
  listSubnets(@Query('scope') scope?: string, @Query('environment') environment?: string) {
    return this.service.listSubnets({ scope, environment });
  }

  @Post('subnets')
  createSubnet(@Body() dto: any) {
    return this.service.createSubnet(dto);
  }

  @Get('subnets/:id')
  getSubnet(@Param('id') id: string) {
    return this.service.getSubnet(id);
  }

  @Get('subnets/:id/usage')
  getSubnetUsage(@Param('id') id: string) {
    return this.service.getSubnetUsage(id);
  }

  @Get('subnets/:id/addresses')
  listAddresses(@Param('id') id: string, @Query('status') status?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.service.listAddresses(id, { status, page: page ? +page : undefined, pageSize: pageSize ? +pageSize : undefined });
  }

  @Post('allocate')
  allocate(@Body() dto: { subnetId: string; ip: string; resourceId: string; actor: string }) {
    return this.service.allocate(dto.subnetId, dto.ip, dto.resourceId, dto.actor);
  }

  @Post('release')
  release(@Body() dto: { subnetId: string; ip: string; actor: string }) {
    return this.service.release(dto.subnetId, dto.ip, dto.actor);
  }

  @Get('conflicts')
  listConflicts() {
    return this.service.listConflicts();
  }
}
