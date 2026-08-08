/**
 * Reporting 限界上下文 (F11)
 */
import { Module } from '@nestjs/common';
import { ReportingService } from './application/reporting.service';
import { ReportingController } from './application/reporting.controller';

@Module({
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
