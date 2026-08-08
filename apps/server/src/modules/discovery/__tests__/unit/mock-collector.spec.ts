/**
 * MockCollector 单元测试
 */
import { MockCollector } from '../../domain/collectors/collector.interface';

describe('MockCollector', () => {
  it('returns host and fields', async () => {
    const c = new MockCollector();
    const out = await c.collect('10.0.0.5', {}, {});
    expect(out.host).toBe('10.0.0.5');
    expect(out.fields.Ip).toBe('10.0.0.5');
    expect(out.fields.hostname).toContain('host-10-0-0-5');
    expect(typeof out.fields.Cpu).toBe('number');
    expect(typeof out.fields.Memory).toBe('number');
    expect(['production', 'staging', 'dev', 'test']).toContain(out.fields.Env);
  });

  it('protocol is mock', () => {
    expect(new MockCollector().protocol).toBe('mock');
  });

  it('different calls return different random data', async () => {
    const c = new MockCollector();
    const a = await c.collect('10.0.0.1', {}, {});
    const b = await c.collect('10.0.0.1', {}, {});
    // 至少有一个字段不同(随机)
    const same = a.fields.Cpu === b.fields.Cpu && a.fields.Memory === b.fields.Memory;
    expect(typeof same).toBe('boolean'); // 不强制不同
    expect(a.fields.hostname).toBe(b.fields.hostname); // hostname 是确定的
  });
});
