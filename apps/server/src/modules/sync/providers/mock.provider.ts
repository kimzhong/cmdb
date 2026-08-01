import { Injectable, Logger } from '@nestjs/common';
import { CloudProvider, RemoteResource, SyncContext } from './cloud-provider.interface';

/**
 * Mock provider：生成假数据，用于本地/测试环境跑通整条链路。
 * 接阿里云/腾讯云/AWS 时，新建一个文件 implements CloudProvider，
 * 在 SyncService 的 providers 字典里注册即可。
 */
@Injectable()
export class MockProvider implements CloudProvider {
  readonly name = 'mock';
  private readonly logger = new Logger(MockProvider.name);

  async fetch(ctx: SyncContext): Promise<RemoteResource[]> {
    this.logger.log(`[mock] fetch: region=${ctx.region} type=${ctx.resourceType} model=${ctx.modelUid}`);
    // 生成 5 条假 ECS
    const now = Date.now();
    return [1, 2, 3, 4, 5].map((i) => ({
      InstanceId: `mock-${ctx.modelUid}-${i}`,
      InstanceName: `mock-${ctx.modelUid}-${i}-${new Date(now).toISOString().slice(0, 10)}`,
      Cpu: 2 + i,
      Memory: 4 * i,
      Region: ctx.region ?? 'cn-hangzhou',
      Status: i % 2 === 0 ? 'Running' : 'Stopped',
    }));
  }
}
