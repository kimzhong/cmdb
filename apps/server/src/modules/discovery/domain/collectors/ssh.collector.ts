/**
 * SSH Collector (scaffold)
 * 需要安装 ssh2 库
 * 用法: pnpm --filter @cmdb/server add ssh2
 *
 * 当前为占位实现,实际生产用 ssh2.execCommand 跑 lscpu / free / df 等
 */
import { Collector, CollectorOutput } from './collector.interface';

export class SshCollector implements Collector {
  readonly protocol = 'ssh';

  async collect(target: string, credentials: any, _options: any): Promise<CollectorOutput> {
    // 简化: 假设 ssh2 已安装
    let Client: any;
    try {
      ({ Client } = require('ssh2'));
    } catch {
      throw new Error('ssh2 包未安装,请运行 pnpm --filter @cmdb/server add ssh2');
    }

    return new Promise((resolve, reject) => {
      const conn = new Client();
      conn.on('ready', () => {
        conn.exec('uname -a && nproc && free -m | head -2', (err: any, stream: any) => {
          if (err) { conn.end(); return reject(err); }
          let out = '';
          stream.on('close', () => {
            conn.end();
            // 简化解析
            const lines = out.split('\n');
            const hostname = (lines[0] || target).trim();
            const cpu = parseInt((lines[1] || '1').trim(), 10) || 1;
            const memLine = (lines[2] || '').split(/\s+/);
            const memory = parseInt(memLine[1] || '0', 10) || 0;
            resolve({
              host: target,
              fields: {
                Ip: target,
                hostname,
                Cpu: cpu,
                Memory: memory,
                Os: hostname.includes('Ubuntu') ? 'Ubuntu' : hostname.includes('CentOS') ? 'CentOS' : 'Linux',
                Status: 'online',
              },
            });
          });
          stream.on('data', (data: any) => { out += data.toString(); });
          stream.stderr.on('data', (data: any) => { out += data.toString(); });
        });
      });
      conn.on('error', (err: any) => reject(err));
      conn.connect({
        host: target,
        port: credentials.port || 22,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey,
      });
    });
  }
}
