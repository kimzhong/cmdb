import { Controller, Get } from '@nestjs/common';
import { ReportingService } from './reporting.service';

@Controller('api/reports')
export class ReportingController {
  constructor(private readonly service: ReportingService) {}

  @Get('summary')
  summary() { return this.service.getSummary(); }

  @Get('lifecycle-distribution')
  lifecycle() { return this.service.getLifecycleDistribution(); }

  @Get('approval-pending')
  approvalPending() { return this.service.getApprovalPending(); }

  @Get('ipam-usage')
  ipamUsage() { return this.service.getIpamUsage(); }

  @Get('discovery-stats')
  async discoveryStats() { return this.service.getDiscoveryStats(); }
}
