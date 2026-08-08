/**
 * RelationType 应用服务
 * 关系类型 CRUD
 */
import { Injectable } from '@nestjs/common';
import { RelationType } from '../domain/relation.aggregate';
import { RelationRepository } from '../infra/relation.repository';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '@cmdb/shared/types/error-code';

export interface CreateRelationTypeDto {
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
}

@Injectable()
export class RelationTypesService {
  constructor(private readonly repo: RelationRepository) {}

  async list() {
    const docs = await this.repo.listTypes();
    return docs.map((d) => this.toDto(d.toObject ? d.toObject() : d));
  }

  async create(dto: CreateRelationTypeDto) {
    // 查重
    const existing = await this.repo.findTypeByCode(dto.code);
    if (existing) {
      throw new BusinessException(ErrorCode.ALREADY_EXISTS, `关系类型 ${dto.code} 已存在`);
    }
    // 领域对象校验
    RelationType.createUserType(dto);
    const doc = await this.repo.createType({ ...dto, isSystem: false });
    return this.toDto(doc.toObject());
  }

  async remove(code: string) {
    const ok = await this.repo.deleteType(code);
    if (!ok) {
      const t = await this.repo.findTypeByCode(code);
      if (!t) throw new BusinessException(ErrorCode.RELATION_TYPE_NOT_FOUND);
      if (t.isSystem) throw new BusinessException(ErrorCode.VALIDATION_FAILED, '系统预置关系类型不可删除');
      throw new BusinessException(ErrorCode.RELATION_TYPE_IN_USE, '该关系类型正在使用,无法删除');
    }
  }

  private toDto(d: any) {
    return {
      id: d._id?.toString(),
      code: d.code,
      name: d.name,
      inverseCode: d.inverseCode,
      inverseName: d.inverseName,
      description: d.description,
      cardinality: d.cardinality,
      sourceTypeConstraint: d.sourceTypeConstraint,
      targetTypeConstraint: d.targetTypeConstraint,
      sourceModelConstraint: d.sourceModelConstraint,
      targetModelConstraint: d.targetModelConstraint,
      bidirectional: d.bidirectional,
      isSystem: d.isSystem,
      icon: d.icon,
      color: d.color,
    };
  }
}
