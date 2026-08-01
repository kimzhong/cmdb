/** 远端资源（由 provider 返回的原始数据） */
export interface RemoteResource {
  [remoteField: string]: unknown;
}

export interface SyncContext {
  taskId: string;
  modelUid: string;
  region?: string;
  resourceType?: string;
  fieldMapping: Array<{ remote: string; local: string }>;
  uniqueKey: string;
  syncMode: 'full' | 'incremental';
}

/** 远端云适配器接口 */
export interface CloudProvider {
  readonly name: string;
  /** 拉取远端资源 */
  fetch(ctx: SyncContext): Promise<RemoteResource[]>;
}
