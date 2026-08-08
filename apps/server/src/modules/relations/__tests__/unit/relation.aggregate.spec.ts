/**
 * Relation 聚合根 单元测试
 * 验证自指/约束校验/归档
 */
import { Relation, RelationType } from '../../domain/relation.aggregate';
import { ErrorCode } from '@cmdb/shared/types/error-code';

describe('Relation aggregate', () => {
  describe('create()', () => {
    it('given self-relation then throws VALIDATION_FAILED', () => {
      try {
        Relation.create({
          source: { id: 'A', type: 'resource' },
          target: { id: 'A', type: 'resource' },
          relationType: 'depends_on',
          createdBy: 'admin',
        });
        fail('should throw');
      } catch (e: any) {
        expect(e.getResponse().code).toBe(ErrorCode.VALIDATION_FAILED);
      }
    });

    it('given type constraint mismatch then throws RELATION_CONSTRAINT_VIOLATION', () => {
      const typeDef = RelationType.fromSystem({
        code: 'runs_on',
        name: '运行在',
        inverseCode: 'hosted_by',
        cardinality: 'N:1',
        sourceTypeConstraint: 'resource',
        targetTypeConstraint: 'resource',
        bidirectional: false,
        isSystem: true,
      });
      try {
        Relation.create({
          source: { id: 'A', type: 'app' }, // 应该是 resource
          target: { id: 'B', type: 'resource' },
          relationType: 'runs_on',
          createdBy: 'admin',
        }, typeDef);
        fail('should throw');
      } catch (e: any) {
        expect(e.getResponse().code).toBe(ErrorCode.RELATION_CONSTRAINT_VIOLATION);
      }
    });

    it('given valid input then creates relation', () => {
      const r = Relation.create({
        source: { id: 'A', type: 'resource' },
        target: { id: 'B', type: 'resource' },
        relationType: 'depends_on',
        createdBy: 'admin',
      });
      expect(r.status).toBe('active');
      expect(r.isAutoDiscovered).toBe(false);
    });
  });

  describe('archive()', () => {
    it('returns a new relation with status=archived', () => {
      const r = Relation.create({
        source: { id: 'A', type: 'resource' },
        target: { id: 'B', type: 'resource' },
        relationType: 'depends_on',
        createdBy: 'admin',
      });
      const a = r.archive('admin');
      expect(a.status).toBe('archived');
      expect(r.status).toBe('active'); // 不可变
    });
  });
});

describe('RelationType', () => {
  describe('createUserType()', () => {
    it('given invalid code (uppercase) then throws INVALID_INPUT', () => {
      try {
        RelationType.createUserType({
          code: 'InvalidCode',
          name: 'x',
          inverseCode: 'inverse_x',
          cardinality: 'N:1',
        });
        fail('should throw');
      } catch (e: any) {
        expect(e.getResponse().code).toBe(ErrorCode.INVALID_INPUT);
      }
    });

    it('given valid input then creates with isSystem=false', () => {
      const t = RelationType.createUserType({
        code: 'custom_relation',
        name: '自定义关系',
        inverseCode: 'custom_inverse',
        cardinality: 'N:M',
        bidirectional: true,
      });
      expect(t.code).toBe('custom_relation');
      expect(t.isSystem).toBe(false);
      expect(t.bidirectional).toBe(true);
    });
  });
});
