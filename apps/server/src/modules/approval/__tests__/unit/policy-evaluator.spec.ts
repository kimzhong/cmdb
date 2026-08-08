/**
 * PolicyEvaluator 测试
 */
import { ApprovalType } from '@cmdb/shared/types/approval';
import { Action } from '@cmdb/shared/types/action';
import { PolicyEvaluator } from '../../domain/policy-evaluator';

const policies = [
  {
    id: 'p1',
    name: '删资源',
    appliesTo: { type: 'resource' as const },
    trigger: ApprovalType.DELETE_RESOURCE,
    conditions: [],
    steps: [{ name: 'admin', approverType: 'role' as const, approverValue: 'admin', timeoutHours: 48 }],
    enabled: true,
    priority: 100,
  },
  {
    id: 'p2',
    name: '生产环境更新需 owner+admin',
    appliesTo: { type: 'resource' as const },
    trigger: ApprovalType.UPDATE_RESOURCE,
    conditions: [{ field: 'environment', op: 'eq' as const, value: 'production' }],
    steps: [
      { name: 'owner', approverType: 'field_owner' as const, approverValue: 'owner', timeoutHours: 24 },
      { name: 'admin', approverType: 'role' as const, approverValue: 'admin', timeoutHours: 48 },
    ],
    enabled: true,
    priority: 90,
  },
  {
    id: 'p3',
    name: 'admin 豁免',
    appliesTo: { type: 'resource' as const },
    trigger: ApprovalType.UPDATE_RESOURCE,
    conditions: [{ field: '_userRole', op: 'eq' as const, value: 'admin' }],
    steps: [],
    enabled: true,
    priority: 1000,
  },
];

describe('PolicyEvaluator', () => {
  const e = new PolicyEvaluator();

  it('given delete action then returns p1', () => {
    const p = e.findMatchingPolicy(Action.DELETE, { type: 'resource' }, policies as any);
    expect(p?.id).toBe('p1');
  });

  it('given update on production then returns p2 (matches conditions)', () => {
    const p = e.findMatchingPolicy(Action.UPDATE, { type: 'resource', data: { environment: 'production' } }, policies as any);
    expect(p?.id).toBe('p2');
  });

  it('given update on dev then no match (no condition match)', () => {
    const p = e.findMatchingPolicy(Action.UPDATE, { type: 'resource', data: { environment: 'dev' } }, policies as any);
    expect(p).toBeNull();
  });

  it('given update by admin on production then matches p3 (higher priority)', () => {
    const p = e.findMatchingPolicy(Action.UPDATE, { type: 'resource', data: { environment: 'production' }, userRole: 'admin' }, policies as any);
    expect(p?.id).toBe('p3');
  });

  it('given relation type then not matched by resource policies', () => {
    const p = e.findMatchingPolicy(Action.DELETE, { type: 'relation' }, policies as any);
    expect(p).toBeNull();
  });
});
