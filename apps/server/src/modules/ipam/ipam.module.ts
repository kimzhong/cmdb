/**
 * IPAM 限界上下文 (F8)
 *
 * 责任:
 *  - 子网管理 (ipam_subnets, CIDR 层级)
 *  - IP 地址管理 (ipam_addresses)
 *  - 分配/释放/冲突检测
 *  - 跨区域 Scope
 */
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class IpamModule {}
