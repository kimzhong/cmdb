/**
 * LifecycleService - 资源生命周期领域服务
 *
 * 责任:
 *  - 状态机校验 (基于 @cmdb/shared LifecycleStateTransitions)
 *  - transition / softDelete / restore
 *  - 维护 lifecycle.history
 *
 * 注意: 这是纯领域服务,无 IO。
 *       实际持久化由调用方 (ResourcesService) 完成。
 */
import { Injectable } from '@nestjs/common';
import { LifecycleState, canTransition as sharedCanTransition } from '@cmdb/shared/types';
import { ErrorCode } from '@cmdb/shared/types/error-code';
import { BusinessException } from '../../../common/exceptions/business.exception';

export interface LifecycleSnapshot {
  state: LifecycleState;
  previousState?: LifecycleState;
  enteredAt: Date;
  enteredBy: string;
  history?: LifecycleHistoryEntry[];
}

export interface LifecycleHistoryEntry {
  from: LifecycleState;
  to: LifecycleState;
  reason?: string;
  actor: string;
  at: Date;
}

export interface TransitionCommand {
  resourceId: string;
  from: LifecycleState;
  to: LifecycleState;
  reason?: string;
  actor: string;
  at?: Date;
}

@Injectable()
export class LifecycleService {
  /** 判断状态机是否允许 */
  canTransition(from: LifecycleState, to: LifecycleState): boolean {
    return sharedCanTransition(from, to);
  }

  /** 列出 from 状态可达的目标状态 */
  nextStates(from: LifecycleState): LifecycleState[] {
    // 从共享常量中获取
    const all = Object.values(LifecycleState);
    return all.filter((s) => s !== from && this.canTransition(from, s));
  }

  /**
   * 应用状态变更,返回新的 lifecycle snapshot(纯函数,无 IO)
   * 调用方负责把 snapshot 写回 DB
   */
  applyTransition(snapshot: LifecycleSnapshot | undefined, cmd: TransitionCommand): LifecycleSnapshot {
    const currentState = snapshot?.state ?? LifecycleState.IN_USE; // 默认 in_use(老数据兼容)
    if (!this.canTransition(currentState, cmd.to)) {
      throw new BusinessException(
        ErrorCode.LIFECYCLE_INVALID_TRANSITION,
        `状态机不允许从 ${currentState} 变更到 ${cmd.to}`,
        { from: currentState, to: cmd.to, allowed: this.nextStates(currentState) },
      );
    }
    const at = cmd.at ?? new Date();
    const history = snapshot?.history ?? [];
    return {
      state: cmd.to,
      previousState: currentState,
      enteredAt: at,
      enteredBy: cmd.actor,
      history: [
        ...history.slice(-19), // 保留最近 20 条
        { from: currentState, to: cmd.to, reason: cmd.reason, actor: cmd.actor, at },
      ],
    };
  }

  /** 应用软删除 */
  applySoftDelete(snapshot: LifecycleSnapshot | undefined, actor: string, at?: Date): LifecycleSnapshot {
    const current = snapshot?.state ?? LifecycleState.IN_USE;
    return this.applyTransition(
      { ...(snapshot ?? { state: current, enteredAt: at ?? new Date(), enteredBy: actor }) },
      { resourceId: '', from: current, to: LifecycleState.DELETED, reason: 'soft delete', actor, at },
    );
  }

  /** 应用恢复:从 deleted 恢复到 in_stock(特殊操作) */
  applyRestore(snapshot: LifecycleSnapshot | undefined, actor: string, at?: Date): LifecycleSnapshot {
    const current = snapshot?.state ?? LifecycleState.DELETED;
    if (current !== LifecycleState.DELETED) {
      throw new BusinessException(
        ErrorCode.LIFECYCLE_INVALID_TRANSITION,
        '只能从 deleted 状态恢复资源',
        { current },
      );
    }
    const restoredAt = at ?? new Date();
    return {
      state: LifecycleState.IN_STOCK,
      previousState: LifecycleState.DELETED,
      enteredAt: restoredAt,
      enteredBy: actor,
      history: [
        ...(snapshot?.history ?? []).slice(-19),
        { from: LifecycleState.DELETED, to: LifecycleState.IN_STOCK, reason: 'restore from trash', actor, at: restoredAt },
      ],
    };
  }
}
