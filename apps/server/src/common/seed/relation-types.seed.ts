/**
 * 关系类型 seed 数据
 * Sprint 1 完成 relation_types schema 后启动时自动 seed
 */
import { SystemRelationTypes } from '@cmdb/shared/types/relation';

export interface RelationTypeSeed {
  code: string;
  name: string;
  inverseCode: string;
  inverseName: string;
  cardinality: string;
  sourceConstraint?: string;
  targetConstraint?: string;
  bidirectional: boolean;
  isSystem: true;
  icon?: string;
  color?: string;
}

export const RELATION_TYPE_SEEDS: RelationTypeSeed[] = SystemRelationTypes.map((r) => ({
  code: r.code,
  name: r.name,
  inverseCode: r.inverseCode,
  inverseName: r.inverseName,
  cardinality: r.cardinality,
  sourceConstraint: r.sourceConstraint,
  targetConstraint: r.targetConstraint,
  bidirectional: r.bidirectional,
  isSystem: true as const,
  color: r.color,
  icon: r.icon,
}));
