/**
 * Relations 应用服务
 * 核心业务:
 *  - 创建/查询/删除关系
 *  - 资源删除/恢复时级联关系状态
 *  - 图谱查询(委托 GraphService)
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Relation, RelationType, EndpointType } from '../domain/relation.aggregate';
import { GraphService, TraverseOptions, PathOptions } from '../domain/graph.service';
import { RelationRepository } from '../infra/relation.repository';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '@cmdb/shared/types/error-code';

export interface CreateRelationDto {
  sourceId: string;
  sourceType: EndpointType;
  targetId: string;
  targetType: EndpointType;
  relationType: string;
  attributes?: Record<string, any>;
  createdBy: string;
}

@Injectable()
export class RelationsService implements OnModuleInit {
  constructor(
    private readonly repo: RelationRepository,
    private readonly graph: GraphService,
    private readonly emitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // 订阅资源删除/恢复,级联关系
    this.emitter.on('resource.deleted', async (e: { resourceId: string }) => {
      await this.repo.archiveByNode(e.resourceId, 'resource');
    });
    this.emitter.on('resource.restored', async (e: { resourceId: string }) => {
      await this.repo.restoreByNode(e.resourceId, 'resource');
    });
    this.emitter.on('app.deleted', async (e: { appId: string }) => {
      await this.repo.archiveByNode(e.appId, 'app');
    });
  }

  async create(dto: CreateRelationDto) {
    // 1. 查 type 定义
    const typeDoc = await this.repo.findTypeByCode(dto.relationType);
    if (!typeDoc) {
      throw new BusinessException(ErrorCode.RELATION_TYPE_NOT_FOUND, `关系类型 ${dto.relationType} 不存在`);
    }
    const typeDef = RelationType.fromPersistence(typeDoc.toObject());

    // 2. 环检测
    const allEdges = await this.repo.loadAllEdges();
    const cycle = this.graph.detectCycle(
      dto.sourceId, dto.sourceType,
      dto.targetId, dto.targetType,
      allEdges,
    );
    if (cycle.hasCycle) {
      throw new BusinessException(
        ErrorCode.RELATION_CYCLE,
        '添加该关系会形成环',
        { path: cycle.path },
      );
    }

    // 3. 校验并创建领域对象
    const relation = Relation.create(
      {
        source: { id: dto.sourceId, type: dto.sourceType },
        target: { id: dto.targetId, type: dto.targetType },
        relationType: dto.relationType,
        inverseRelationType: typeDef.inverseCode,
        attributes: dto.attributes,
        createdBy: dto.createdBy,
      },
      typeDef,
    );

    // 4. 持久化
    const doc = await this.repo.create(relation.toProps());

    // 5. 事件
    this.emitter.emit('relation.created', { relationId: doc._id.toString() });

    return this.toDto(doc.toObject());
  }

  async findById(id: string) {
    const doc = await this.repo.findById(id);
    if (!doc) throw new BusinessException(ErrorCode.RELATION_NOT_FOUND);
    return this.toDto(doc.toObject());
  }

  async findAll(filter: any = {}) {
    const docs = await this.repo.findAll(filter);
    return docs.map((d) => this.toDto(d.toObject()));
  }

  async remove(id: string) {
    const ok = await this.repo.archiveById(id);
    if (!ok) throw new BusinessException(ErrorCode.RELATION_NOT_FOUND);
    this.emitter.emit('relation.archived', { relationId: id });
  }

  /** 图遍历 */
  async traverse(rootId: string, rootType: EndpointType, opts: TraverseOptions) {
    const edges = await this.repo.loadAllEdges();
    return this.graph.traverse(rootId, rootType, edges, opts);
  }

  /** 路径 */
  async findPath(fromId: string, fromType: EndpointType, toId: string, toType: EndpointType, opts: PathOptions) {
    const edges = await this.repo.loadAllEdges();
    return this.graph.findPath(fromId, fromType, toId, toType, edges, opts);
  }

  /** 影响分析 */
  async impactAnalysis(rootId: string, rootType: EndpointType, opts: PathOptions) {
    const edges = await this.repo.loadAllEdges();
    return this.graph.impactAnalysis(rootId, rootType, edges, opts);
  }

  private toDto(d: any) {
    return {
      id: d._id?.toString(),
      sourceId: d.sourceId,
      sourceType: d.sourceType,
      targetId: d.targetId,
      targetType: d.targetType,
      relationType: d.relationType,
      inverseRelationType: d.inverseRelationType,
      attributes: d.attributes,
      isAutoDiscovered: d.isAutoDiscovered,
      status: d.status,
      createdBy: d.createdBy,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }
}
