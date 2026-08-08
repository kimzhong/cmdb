/**
 * Relations 限界上下文 (F1 + F2)
 *
 * 责任:
 *  - 关系类型管理 (relation_types)
 *  - 关系实例管理 (relations, 边表)
 *  - 图谱查询 (GraphService: traverse / findPath / impact / cycle)
 *
 * 上下游:
 *  - 上游消费 resources / apps / ipam / room (通过 ResourceProxy)
 *  - 下游被 reporting / permissions 消费 (通过事件)
 */
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class RelationsModule {}
