/**
 * 采集器接口 + Mock 实现
 * 各种协议(SSH/SNMP/HTTP/Agent/Mock)实现此接口
 */

export interface CollectorOutput {
  /** 主机 ID(IP 或 hostname) */
  host: string;
  /** 采集到的字段(键值对,与 model field uid 对应) */
  fields: Record<string, any>;
  /** 可选: 关系列表(自动发现的关系) */
  relations?: { targetHost: string; relationType: string }[];
}

export interface Collector {
  /** 协议名 */
  readonly protocol: string;
  /** 采集单个 host(在 DiscoveryService 内串行或并行) */
  collect(target: string, credentials: any, options: any): Promise<CollectorOutput>;
}

/** 模拟采集器:返回固定 host 列表,每个 host 给一些随机字段 */
export class MockCollector implements Collector {
  readonly protocol = 'mock';

  async collect(target: string, _credentials: any, _options: any): Promise<CollectorOutput> {
    // 模拟网络延迟
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
    return {
      host: target,
      fields: {
        Ip: target,
        hostname: `host-${target.replace(/\./g, '-')}`,
        Cpu: 4 + Math.floor(Math.random() * 32),
        Memory: 4096 + Math.floor(Math.random() * 28672),
        Env: ['production', 'staging', 'dev', 'test'][Math.floor(Math.random() * 4)],
        Os: ['CentOS 7', 'Ubuntu 22.04', 'Debian 11', 'Alma 8'][Math.floor(Math.random() * 4)],
        Status: 'online',
        Owner: `user-${Math.floor(Math.random() * 5)}`,
      },
    };
  }
}
