/**
 * Relation / RelationType 仓储
 * 封装 Mongoose 查询,提供应用层使用
 */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Relation, RelationDocument } from './relation.schema';
import { RelationType, RelationTypeDocument } from './relation-type.schema';
import { RelationEdge } from '../domain/graph.service';

@Injectable()
export class RelationRepository {
  constructor(
    @InjectModel(Relation.name) private readonly relModel: Model<RelationDocument>,
    @InjectModel(RelationType.name) private readonly typeModel: Model<RelationTypeDocument>,
  ) {}

  // ========== Relation CRUD ==========
  async create(data: Partial<Relation>): Promise<RelationDocument> {
    return this.relModel.create(data);
  }

  async findById(id: string): Promise<RelationDocument | null> {
    return this.relModel.findById(id).exec();
  }

  async findAll(filter: { sourceId?: string; targetId?: string; sourceType?: string; targetType?: string; relationType?: string; status?: string } = {}): Promise<RelationDocument[]> {
    return this.relModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findByNode(nodeId: string, nodeType: string, status: string = 'active'): Promise<RelationDocument[]> {
    return this.relModel.find({
      $or: [
        { sourceId: nodeId, sourceType: nodeType, status },
        { targetId: nodeId, targetType: nodeType, status },
      ],
    }).exec();
  }

  async update(id: string, patch: Partial<Relation>): Promise<RelationDocument | null> {
    return this.relModel.findByIdAndUpdate(id, patch, { new: true }).exec();
  }

  async archiveById(id: string): Promise<RelationDocument | null> {
    return this.relModel.findByIdAndUpdate(id, { status: 'archived' }, { new: true }).exec();
  }

  /** 物理删除(仅 admin 调试用) */
  async deleteById(id: string): Promise<boolean> {
    const r = await this.relModel.findByIdAndDelete(id).exec();
    return !!r;
  }

  /** 级联:某节点被删除时,把所有 related 关系归档 */
  async archiveByNode(nodeId: string, nodeType: string): Promise<number> {
    const r = await this.relModel.updateMany(
      {
        $or: [
          { sourceId: nodeId, sourceType: nodeType, status: 'active' },
          { targetId: nodeId, targetType: nodeType, status: 'active' },
        ],
      },
      { $set: { status: 'archived' } },
    );
    return r.modifiedCount ?? 0;
  }

  /** 级联:节点被恢复时,恢复相关关系 */
  async restoreByNode(nodeId: string, nodeType: string): Promise<number> {
    const r = await this.relModel.updateMany(
      {
        $or: [
          { sourceId: nodeId, sourceType: nodeType, status: 'archived' },
          { targetId: nodeId, targetType: nodeType, status: 'archived' },
        ],
      },
      { $set: { status: 'active' } },
    );
    return r.modifiedCount ?? 0;
  }

  /** 加载所有边(用于 GraphService 全图遍历) */
  async loadAllEdges(): Promise<RelationEdge[]> {
    const rels = await this.relModel.find({ status: 'active' }).lean().exec();
    const types = await this.typeModel.find({ isSystem: true }).lean().exec();
    const typeMap = new Map(types.map((t) => [t.code, t]));
    return rels.map((r: any) => ({
      id: r._id.toString(),
      sourceId: r.sourceId,
      sourceType: r.sourceType,
      targetId: r.targetId,
      targetType: r.targetType,
      relationType: r.relationType,
      inverseRelationType: r.inverseRelationType,
      attributes: r.attributes,
      status: r.status,
      isBidirectional: typeMap.get(r.relationType)?.bidirectional ?? false,
    }));
  }

  /** 加载与某节点相关的边(用于图遍历,避免全图) */
  async loadEdgesByNodes(nodeIds: string[], nodeType?: string): Promise<RelationEdge[]> {
    const filter: any = {
      $or: [
        { sourceId: { $in: nodeIds } },
        { targetId: { $in: nodeIds } },
      ],
      status: 'active',
    };
    if (nodeType) {
      filter.$and = [
        { $or: [{ sourceType: nodeType }, { targetType: nodeType }] },
      ];
    }
    const rels = await this.relModel.find(filter).lean().exec();
    return rels.map((r: any) => ({
      id: r._id.toString(),
      sourceId: r.sourceId,
      sourceType: r.sourceType,
      targetId: r.targetId,
      targetType: r.targetType,
      relationType: r.relationType,
      inverseRelationType: r.inverseRelationType,
      attributes: r.attributes,
      status: r.status,
      isBidirectional: false,
    }));
  }

  // ========== RelationType CRUD ==========
  async createType(data: Partial<RelationType>): Promise<RelationTypeDocument> {
    return this.typeModel.create(data);
  }

  async findTypeByCode(code: string): Promise<RelationTypeDocument | null> {
    return this.typeModel.findOne({ code }).exec();
  }

  async listTypes(): Promise<RelationTypeDocument[]> {
    return this.typeModel.find().sort({ isSystem: -1, code: 1 }).exec();
  }

  async deleteType(code: string): Promise<boolean> {
    // 不允许删系统预置
    const t = await this.typeModel.findOne({ code });
    if (!t) return false;
    if (t.isSystem) return false;
    const inUse = await this.relModel.countDocuments({ relationType: code });
    if (inUse > 0) return false;
    await this.typeModel.deleteOne({ code });
    return true;
  }
}
