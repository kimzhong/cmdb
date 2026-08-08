/**
 * Discovery 限界上下文 (F7)
 *
 * 责任:
 *  - 自动发现任务管理 (discovery_tasks)
 *  - 多种协议采集器 (SSH / SNMP / IPMI / HTTP / Agent)
 *  - 执行历史 (discovery_runs)
 *  - 采集结果 -> resources (走 approval 拦截 if required)
 */
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class DiscoveryModule {}
