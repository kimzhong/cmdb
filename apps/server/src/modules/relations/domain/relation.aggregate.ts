/**
 * Relation 领域层 - 实体与值对象
 * 纯业务逻辑,无框架依赖
 */
import { ErrorCode } from '@cmdb/shared/types/error-code';
import { BusinessException } from '../../../common/exceptions/business.exception';

export type EndpointType = 'resource' | 'app' | 'business' | 'subnet' | 'cabinet';

export interface RelationEndpoint {
  id: string;
  type: EndpointType;
}

export interface RelationAttributes {
  [key: string]: any;
}

export interface RelationTypeDef {
  code: string;
  name: string;
  inverseCode: string;
  inverseName?: string;
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:M';
  sourceTypeConstraint?: string;
  targetTypeConstraint?: string;
  sourceModelConstraint?: string;
  targetModelConstraint?: string;
  bidirectional: boolean;
  isSystem: boolean;
  color?: string;
  icon?: string;
}

export interface RelationProps {
  id?: string;
  source: RelationEndpoint;
  target: RelationEndpoint;
  relationType: string;
  inverseRelationType?: string;
  attributes?: RelationAttributes;
  isAutoDiscovered?: boolean;
  status?: 'active' | 'pending' | 'archived';
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Relation 聚合根
 * 业务规则:
 *  - 同一对 (source, target, type) 不能重复
 *  - 不可自指 (source == target)
 *  - 必须匹配 relationType 的 source/target 约束
 *  - 删除时级联 inverse 关系(若 bidirectional)
 */
export class Relation {
  readonly id: string;
  readonly source: RelationEndpoint;
  readonly target: RelationEndpoint;
  readonly relationType: string;
  readonly inverseRelationType?: string;
  readonly attributes: RelationAttributes;
  readonly isAutoDiscovered: boolean;
  readonly status: 'active' | 'pending' | 'archived';
  readonly createdBy: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: RelationProps) {
    this.id = props.id ?? '';
    this.source = props.source;
    this.target = props.target;
    this.relationType = props.relationType;
    this.inverseRelationType = props.inverseRelationType;
    this.attributes = props.attributes ?? {};
    this.isAutoDiscovered = props.isAutoDiscovered ?? false;
    this.status = props.status ?? 'active';
    this.createdBy = props.createdBy;
    this.updatedBy = props.updatedBy;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  /** 工厂方法:创建新关系(做校验) */
  static create(props: RelationProps, typeDef?: RelationTypeDef): Relation {
    // 1. 不可自指
    if (props.source.id === props.target.id && props.source.type === props.target.type) {
      throw new BusinessException(
        ErrorCode.VALIDATION_FAILED,
        '关系不能指向自己',
        { source: props.source, target: props.target },
      );
    }
    // 2. 校验 type 约束
    if (typeDef) {
      if (typeDef.sourceTypeConstraint && typeDef.sourceTypeConstraint !== 'any' && typeDef.sourceTypeConstraint !== props.source.type) {
        throw new BusinessException(
          ErrorCode.RELATION_CONSTRAINT_VIOLATION,
          `源端类型必须是 ${typeDef.sourceTypeConstraint},实际是 ${props.source.type}`,
          { source: props.source, constraint: typeDef.sourceTypeConstraint },
        );
      }
      if (typeDef.targetTypeConstraint && typeDef.targetTypeConstraint !== 'any' && typeDef.targetTypeConstraint !== props.target.type) {
        throw new BusinessException(
          ErrorCode.RELATION_CONSTRAINT_VIOLATION,
          `目标端类型必须是 ${typeDef.targetTypeConstraint},实际是 ${props.target.type}`,
          { target: props.target, constraint: typeDef.targetTypeConstraint },
        );
      }
    }
    return new Relation(props);
  }

  /** 工厂方法:从持久化数据重建(不做校验) */
  static fromPersistence(props: RelationProps): Relation {
    return new Relation(props);
  }

  /** 归档(软删除) */
  archive(updatedBy: string): Relation {
    return new Relation({ ...this.toProps(), status: 'archived', updatedBy, updatedAt: new Date() });
  }

  toProps(): RelationProps {
    return {
      id: this.id,
      source: this.source,
      target: this.target,
      relationType: this.relationType,
      inverseRelationType: this.inverseRelationType,
      attributes: this.attributes,
      isAutoDiscovered: this.isAutoDiscovered,
      status: this.status,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

/**
 * 关系类型工厂:创建自定义关系类型
 */
export class RelationType {
  readonly id?: string;
  readonly code: string;
  readonly name: string;
  readonly inverseCode: string;
  readonly inverseName?: string;
  readonly description?: string;
  readonly cardinality: '1:1' | '1:N' | 'N:1' | 'N:M';
  readonly sourceTypeConstraint?: string;
  readonly targetTypeConstraint?: string;
  readonly sourceModelConstraint?: string;
  readonly targetModelConstraint?: string;
  readonly bidirectional: boolean;
  readonly isSystem: boolean;
  readonly color?: string;
  readonly icon?: string;

  private constructor(p: Partial<RelationTypeDef> & { code: string; name: string; inverseCode: string; cardinality: '1:1' | '1:N' | 'N:1' | 'N:M'; description?: string }) {
    this.code = p.code;
    this.name = p.name;
    this.inverseCode = p.inverseCode;
    this.inverseName = p.inverseName;
    this.description = p.description;
    this.cardinality = p.cardinality;
    this.sourceTypeConstraint = p.sourceTypeConstraint;
    this.targetTypeConstraint = p.targetTypeConstraint;
    this.sourceModelConstraint = p.sourceModelConstraint;
    this.targetModelConstraint = p.targetModelConstraint;
    this.bidirectional = p.bidirectional ?? false;
    this.isSystem = p.isSystem ?? false;
    this.color = p.color;
    this.icon = p.icon;
  }

  static createUserType(p: {
    code: string;
    name: string;
    inverseCode: string;
    inverseName?: string;
    description?: string;
    cardinality: '1:1' | '1:N' | 'N:1' | 'N:M';
    sourceTypeConstraint?: string;
    targetTypeConstraint?: string;
    sourceModelConstraint?: string;
    targetModelConstraint?: string;
    bidirectional?: boolean;
    color?: string;
    icon?: string;
  }): RelationType {
    if (!/^[a-z][a-z0-9_]{1,32}$/.test(p.code)) {
      throw new BusinessException(
        ErrorCode.INVALID_INPUT,
        'code 必须是小写字母开头的下划线串,长度 2-33',
        { code: p.code },
      );
    }
    return new RelationType({ ...p, isSystem: false });
  }

  static fromSystem(p: RelationTypeDef): RelationType {
    return new RelationType({ ...p, isSystem: true });
  }

  static fromPersistence(p: any): RelationType {
    return new RelationType({ ...p, isSystem: p.isSystem ?? false });
  }
}
