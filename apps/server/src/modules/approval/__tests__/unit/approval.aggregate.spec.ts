/**
 * Approval 聚合根测试
 */
import { ApprovalStatus, ApprovalType } from '@cmdb/shared/types/approval';
import { ErrorCode } from '@cmdb/shared/types/error-code';
import { Approval } from '../../domain/approval.aggregate';

const base = () => ({
  ticketNo: 'AP-20260101-00001',
  type: ApprovalType.DELETE_RESOURCE,
  targetType: 'resource',
  targetId: 'r1',
  payload: { reason: 'test' },
  requesterId: 'u1',
  requesterName: 'tester',
  policyId: 'p1',
  currentStep: 0,
  totalSteps: 1,
});

describe('Approval aggregate', () => {
  it('create sets status=pending and computes expiresAt', () => {
    const a = Approval.create({ ...base(), expiresInHours: 24 });
    expect(a.status).toBe(ApprovalStatus.PENDING);
    expect(a.expiresAt.getTime() - Date.now()).toBeGreaterThan(23 * 3600 * 1000);
  });

  it('approve finalizes when totalSteps=1', () => {
    const a = Approval.create({ ...base(), totalSteps: 1 });
    a.approve('u2', 'admin', 'OK');
    expect(a.status).toBe(ApprovalStatus.APPROVED);
    expect(a.decisions).toHaveLength(1);
  });

  it('approve advances step when totalSteps>1', () => {
    const a = Approval.create({ ...base(), totalSteps: 2 });
    a.approve('u2', 'admin', 'LGTM');
    expect(a.status).toBe(ApprovalStatus.PENDING);
    expect(a.currentStep).toBe(1);
    a.approve('u3', 'admin2', 'OK');
    expect(a.status).toBe(ApprovalStatus.APPROVED);
  });

  it('reject sets status=rejected', () => {
    const a = Approval.create({ ...base() });
    a.reject('u2', 'admin', 'NOPE');
    expect(a.status).toBe(ApprovalStatus.REJECTED);
  });

  it('cancel only by requester', () => {
    const a = Approval.create({ ...base() });
    try {
      a.cancel('u999');
      fail('should throw');
    } catch (e: any) {
      expect(e.getResponse().code).toBe(ErrorCode.APPROVAL_PERMISSION_DENIED);
    }
    a.cancel('u1');
    expect(a.status).toBe(ApprovalStatus.CANCELLED);
  });

  it('markApplied requires approved', () => {
    const a = Approval.create({ ...base() });
    try {
      a.markApplied({ success: true });
      fail('should throw');
    } catch (e: any) {
      expect(e.getResponse().code).toBe(ErrorCode.APPROVAL_ALREADY_DECIDED);
    }
    a.approve('u2', 'admin', 'OK');
    a.markApplied({ success: true });
    expect(a.status).toBe(ApprovalStatus.APPLIED);
    expect(a.appliedAt).toBeDefined();
  });

  it('expire sets status=expired when past expiresAt', () => {
    const a = Approval.create({ ...base(), expiresInHours: -1 });
    a.expire();
    expect(a.status).toBe(ApprovalStatus.EXPIRED);
  });
});
