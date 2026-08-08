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
import { MongooseModule } from '@nestjs/mongoose';
import { Relation, RelationSchema } from './infra/relation.schema';
import { RelationType, RelationTypeSchema } from './infra/relation-type.schema';
import { RelationRepository } from './infra/relation.repository';
import { GraphService } from './domain/graph.service';
import { RelationsService } from './application/relations.service';
import { RelationsController } from './application/relations.controller';
import { RelationTypesService } from './application/relation-types.service';
import { RelationTypesController } from './application/relation-types.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Relation.name, schema: RelationSchema },
      { name: RelationType.name, schema: RelationTypeSchema },
    ]),
  ],
  controllers: [RelationsController, RelationTypesController],
  providers: [RelationRepository, GraphService, RelationsService, RelationTypesService],
  exports: [RelationsService, RelationRepository, GraphService],
})
export class RelationsModule {}
