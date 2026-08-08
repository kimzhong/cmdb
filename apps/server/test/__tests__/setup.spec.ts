/**
 * 测试基础设施冒烟测试
 * 验证 jest + shared 类型 + 工厂函数能正常工作
 */
import { LifecycleState, canTransition } from '@cmdb/shared/types';
import { ErrorCode, ErrorCodeMessages } from '@cmdb/shared/types/error-code';
import {
  makeUser,
  makeResource,
  makeDeletedResource,
  makeRelation,
  makeApproval,
  makeSubnet,
} from '../factories';

describe('Test infrastructure smoke', () => {
  it('shared types: LifecycleState has 6 states', () => {
    const all = Object.values(LifecycleState);
    expect(all).toHaveLength(6);
    expect(all).toContain('in_use');
    expect(all).toContain('deleted');
  });

  it('shared types: canTransition enforces state machine', () => {
    expect(canTransition(LifecycleState.IN_STOCK, LifecycleState.IN_USE)).toBe(true);
    expect(canTransition(LifecycleState.IN_USE, LifecycleState.RETIRED)).toBe(true);
    expect(canTransition(LifecycleState.DELETED, LifecycleState.IN_USE)).toBe(false);
    expect(canTransition(LifecycleState.IN_STOCK, LifecycleState.RETIRED)).toBe(false);
  });

  it('shared types: ErrorCode has SUCCESS and 4xxx range for approval', () => {
    expect(ErrorCode.SUCCESS).toBe(0);
    expect(ErrorCode.APPROVAL_REQUIRED).toBe(4001);
    expect(ErrorCodeMessages[ErrorCode.IPAM_IP_CONFLICT]).toContain('冲突');
  });

  it('factories: makeUser / makeResource / makeRelation return unique ids', () => {
    const u1 = makeUser();
    const u2 = makeUser();
    expect(u1.id).not.toBe(u2.id);
    expect(u1.roles).toContain('admin');

    const r1 = makeResource();
    const r2 = makeResource();
    expect(r1.id).not.toBe(r2.id);
    expect(r1.lifecycle.state).toBe(LifecycleState.IN_USE);

    const rel1 = makeRelation();
    expect(rel1.relationType).toBe('depends_on');
  });

  it('factories: makeDeletedResource marks as deleted', () => {
    const d = makeDeletedResource();
    expect(d.deletedAt).toBeInstanceOf(Date);
    expect(d.lifecycle.state).toBe(LifecycleState.DELETED);
  });

  it('factories: makeSubnet generates unique CIDR', () => {
    const a = makeSubnet();
    const b = makeSubnet();
    expect(a.cidr).not.toBe(b.cidr);
    expect(a.cidr).toMatch(/^10\.\d+\.0\.0\/24$/);
  });

  it('factories: makeApproval has 7-day expiry', () => {
    const a = makeApproval();
    const diffMs = a.expiresAt.getTime() - a.createdAt.getTime();
    expect(diffMs).toBeGreaterThan(6 * 24 * 3600 * 1000);
    expect(diffMs).toBeLessThan(8 * 24 * 3600 * 1000);
  });
});
