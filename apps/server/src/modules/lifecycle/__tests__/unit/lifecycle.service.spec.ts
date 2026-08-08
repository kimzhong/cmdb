/**
 * LifecycleService 单元测试
 * 状态机转换 / 软删除 / 恢复
 */
import { LifecycleState } from '@cmdb/shared/types';
import { ErrorCode } from '@cmdb/shared/types/error-code';
import { LifecycleService } from '../../domain/lifecycle.service';

describe('LifecycleService', () => {
  let svc: LifecycleService;
  beforeEach(() => { svc = new LifecycleService(); });

  describe('canTransition', () => {
    it.each([
      [LifecycleState.IN_STOCK,    LifecycleState.IN_USE, true],
      [LifecycleState.IN_USE,      LifecycleState.RETIRED, true],
      [LifecycleState.IN_USE,      LifecycleState.MAINTAINING, true],
      [LifecycleState.MAINTAINING, LifecycleState.IN_USE, true],
      [LifecycleState.DELETED,     LifecycleState.IN_USE, false], // deleted 不能直接到 in_use
      [LifecycleState.IN_STOCK,    LifecycleState.RETIRED, false], // 必须先 in_use
    ])('canTransition(%s -> %s) === %s', (from, to, expected) => {
      expect(svc.canTransition(from, to)).toBe(expected);
    });
  });

  describe('nextStates', () => {
    it('given IN_USE then returns [MAINTAINING, CHANGING, RETIRED, DELETED]', () => {
      const next = svc.nextStates(LifecycleState.IN_USE).sort();
      expect(next).toEqual([LifecycleState.CHANGING, LifecycleState.DELETED, LifecycleState.MAINTAINING, LifecycleState.RETIRED].sort());
    });

    it('given DELETED then returns [] (empty - must use restore)', () => {
      expect(svc.nextStates(LifecycleState.DELETED)).toEqual([]);
    });
  });

  describe('applyTransition', () => {
    it('given valid transition then returns new snapshot with history', () => {
      const initial = { state: LifecycleState.IN_USE, enteredAt: new Date('2026-01-01'), enteredBy: 'admin' };
      const r = svc.applyTransition(initial, { resourceId: 'r1', from: LifecycleState.IN_USE, to: LifecycleState.RETIRED, actor: 'admin', reason: '下线' });
      expect(r.state).toBe(LifecycleState.RETIRED);
      expect(r.previousState).toBe(LifecycleState.IN_USE);
      expect(r.enteredBy).toBe('admin');
      expect(r.history).toHaveLength(1);
      expect(r.history![0]).toMatchObject({ from: LifecycleState.IN_USE, to: LifecycleState.RETIRED, reason: '下线' });
    });

    it('given invalid transition then throws LIFECYCLE_INVALID_TRANSITION', () => {
      try {
        svc.applyTransition(
          { state: LifecycleState.IN_STOCK, enteredAt: new Date(), enteredBy: 'admin' },
          { resourceId: 'r1', from: LifecycleState.IN_STOCK, to: LifecycleState.RETIRED, actor: 'admin' },
        );
        fail('should throw');
      } catch (e: any) {
        expect(e.getResponse().code).toBe(ErrorCode.LIFECYCLE_INVALID_TRANSITION);
      }
    });

    it('given undefined snapshot then defaults to IN_USE', () => {
      const r = svc.applyTransition(undefined, { resourceId: 'r1', from: LifecycleState.IN_USE, to: LifecycleState.RETIRED, actor: 'admin' });
      expect(r.state).toBe(LifecycleState.RETIRED);
    });
  });

  describe('applySoftDelete', () => {
    it('marks resource as DELETED', () => {
      const r = svc.applySoftDelete({ state: LifecycleState.IN_USE, enteredAt: new Date(), enteredBy: 'admin' }, 'admin');
      expect(r.state).toBe(LifecycleState.DELETED);
    });
  });

  describe('applyRestore', () => {
    it('given deleted snapshot then restores to IN_STOCK', () => {
      const r = svc.applyRestore({ state: LifecycleState.DELETED, enteredAt: new Date(), enteredBy: 'admin' }, 'admin');
      expect(r.state).toBe(LifecycleState.IN_STOCK);
    });

    it('given non-deleted snapshot then throws', () => {
      try {
        svc.applyRestore({ state: LifecycleState.IN_USE, enteredAt: new Date(), enteredBy: 'admin' }, 'admin');
        fail('should throw');
      } catch (e: any) {
        expect(e.getResponse().code).toBe(ErrorCode.LIFECYCLE_INVALID_TRANSITION);
      }
    });
  });
});
