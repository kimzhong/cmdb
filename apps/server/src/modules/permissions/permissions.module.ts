/**
 * Permissions 限界上下文 (F10)
 *
 * 责任:
 *  - 细粒度权限定义 (permissions)
 *  - PolicyEvaluator 领域服务
 *  - PermissionsGuard 全局拦截
 *
 * 横切关注点:被所有 BC 的 Controller 拦截
 */
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class PermissionsModule {}
