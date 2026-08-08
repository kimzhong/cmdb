/**
 * Discovery 应用服务
 * 任务 CRUD + 调度执行
 */
import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DiscoveryTask, DiscoveryTaskDocument } from '../infra/discovery-task.schema';
import { DiscoveryRun, DiscoveryRunDocument } from '../infra/discovery-run.schema';
import { MockCollector, Collector, CollectorOutput } from '../domain/collectors/collector.interface';
import { ModelsService } from '../../meta-model/models/models.service';
import { DynamicSchemaFactory } from '../../resources/dynamic-schema.factory';
import { LifecycleState } from '@cmdb/shared/types';

const COLLECTORS: Record<string, Collector> = {
  mock: new MockCollector(),
};

@Injectable()
export class DiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    @InjectModel(DiscoveryTask.name) private readonly taskModel: Model<DiscoveryTaskDocument>,
    @InjectModel(DiscoveryRun.name) private readonly runModel: Model<DiscoveryRunDocument>,
    private readonly modelsService: ModelsService,
    private readonly factory: DynamicSchemaFactory,
    private readonly emitter: EventEmitter2,
  ) {}

  onModuleInit() {
    // 简单注册 ssh collector(若装了 ssh2 库)
    try {
      const { SshCollector } = require('../domain/collectors/ssh.collector');
      COLLECTORS.ssh = new SshCollector();
    } catch {
      this.logger.warn('ssh2 not installed; SSH collector disabled');
    }
  }

  // ============ Task CRUD ============
  async listTasks(filter: { protocol?: string; enabled?: boolean } = {}) {
    const q: any = {};
    if (filter.protocol) q.protocol = filter.protocol;
    if (filter.enabled !== undefined) q.enabled = filter.enabled;
    const docs = await this.taskModel.find(q).sort({ createdAt: -1 }).exec();
    return docs.map((d) => this.toTaskDto(d.toObject()));
  }

  async createTask(dto: any) {
    const doc = await this.taskModel.create(dto);
    return this.toTaskDto(doc.toObject());
  }

  async updateTask(id: string, patch: any) {
    const doc = await this.taskModel.findByIdAndUpdate(id, patch, { new: true });
    if (!doc) throw new NotFoundException(`任务 ${id} 不存在`);
    return this.toTaskDto(doc.toObject());
  }

  async deleteTask(id: string) {
    const r = await this.taskModel.findByIdAndDelete(id);
    if (!r) throw new NotFoundException(`任务 ${id} 不存在`);
  }

  // ============ Run ============
  async runTask(taskId: string, trigger: 'manual' | 'api' | 'scheduled' = 'manual') {
    const taskDoc = await this.taskModel.findById(taskId);
    if (!taskDoc) throw new NotFoundException(`任务 ${taskId} 不存在`);
    if (!taskDoc.enabled) throw new Error('任务未启用');
    if (taskDoc.status === 'running') throw new Error('任务正在运行中');
    const task = taskDoc.toObject() as any;

    const hosts = this.resolveHosts(task.target);
    const run = await this.runModel.create({
      taskId: taskDoc._id,
      taskName: task.name,
      trigger,
      startedAt: new Date(),
      status: 'running',
      progress: { total: hosts.length, processed: 0, succeeded: 0, failed: 0 },
    });

    // 异步执行
    setImmediate(() => this.executeRun(run._id.toString(), task, hosts).catch((e) => {
      this.logger.error(`Run ${run._id} failed: ${e.message}`);
    }));

    return this.toRunDto(run.toObject());
  }

  private async executeRun(runId: string, task: any, hosts: string[]) {
    const collector = COLLECTORS[task.protocol];
    if (!collector) throw new Error(`不支持的协议: ${task.protocol}`);
    const def = await this.modelsService.findByUid(task.modelUid);
    const M = await this.factory.getModelFor(def);

    const newResources: string[] = [];
    const updatedResources: string[] = [];
    const conflicts: any[] = [];
    let succeeded = 0, failed = 0;
    const logs: any[] = [];

    for (const host of hosts) {
      try {
        const out: CollectorOutput = await collector.collect(host, task.credentials ?? {}, { fieldMapping: task.fieldMapping });
        // fieldMapping: 转换 output fields
        const mapped: any = { ...out.fields };
        for (const [src, dst] of Object.entries<string>(task.fieldMapping ?? {})) {
          if (out.fields[src] !== undefined) {
            (mapped as any)[dst] = out.fields[src];
            delete (mapped as any)[src];
          }
        }
        mapped.uid = out.host;
        mapped.lifecycle = { state: LifecycleState.IN_USE, enteredAt: new Date(), enteredBy: 'discovery' };
        mapped.createdBy = 'discovery';

        // upsert(简化)
        const existing: any = await M.findOne({ uid: out.host }).lean();
        if (existing) {
          const existingId = (existing._id as any).toString();
          // 冲突检测(按 conflictPolicy)
          if (task.conflictPolicy === 'skip') {
            logs.push({ host, level: 'info', message: 'skipped (already exists)', timestamp: new Date() });
            succeeded++;
            continue;
          }
          if (task.conflictPolicy === 'report') {
            for (const [k, v] of Object.entries(mapped)) {
              if (existing[k] && existing[k] !== v) {
                conflicts.push({ resourceId: existingId, field: k, existing: existing[k], discovered: v });
              }
            }
          }
          if (task.conflictPolicy !== 'skip') {
            await M.updateOne({ _id: existing._id }, { $set: mapped });
            updatedResources.push(existingId);
          }
        } else {
          await M.create(mapped);
          newResources.push(out.host);
        }
        succeeded++;
        logs.push({ host, level: 'info', message: 'ok', timestamp: new Date() });
      } catch (e: any) {
        failed++;
        logs.push({ host, level: 'error', message: e.message, timestamp: new Date() });
      }
    }

    const status = failed === 0 ? 'success' : succeeded > 0 ? 'partial' : 'failed';
    await this.runModel.findByIdAndUpdate(runId, {
      finishedAt: new Date(),
      status,
      progress: { total: hosts.length, processed: hosts.length, succeeded, failed },
      logs: logs.slice(-100),
      result: { newResources, updatedResources, conflicts },
      durationMs: Date.now() - new Date().getTime(),
    });
    await this.taskModel.findByIdAndUpdate(task._id, {
      lastRunAt: new Date(),
      lastRunStats: { totalHosts: hosts.length, successHosts: succeeded, failedHosts: failed, newResources: newResources.length, updatedResources: updatedResources.length, conflicts: conflicts.length },
      status,
    });
    this.emitter.emit('discovery.completed', { taskId: task._id, runId, newResources: newResources.length, updatedResources: updatedResources.length, conflicts: conflicts.length });
  }

  private resolveHosts(target: any): string[] {
    if (target.type === 'host_list') return target.hostList ?? [];
    if (target.type === 'ip_range') {
      const { start, end } = target.ipRange ?? {};
      // 简化: 仅支持 /24 内 254 个
      const startLast = parseInt(start.split('.').pop() || '1', 10);
      const endLast = parseInt(end.split('.').pop() || '254', 10);
      const base = start.split('.').slice(0, 3).join('.');
      const hosts: string[] = [];
      for (let i = startLast; i <= endLast; i++) hosts.push(`${base}.${i}`);
      return hosts;
    }
    return [];
  }

  async getRun(runId: string) {
    const r = await this.runModel.findById(runId);
    if (!r) throw new NotFoundException(`运行 ${runId} 不存在`);
    return this.toRunDto(r.toObject());
  }

  async listRuns(taskId: string, limit = 20) {
    const docs = await this.runModel.find({ taskId: new Types.ObjectId(taskId) }).sort({ startedAt: -1 }).limit(limit).exec();
    return docs.map((d) => this.toRunDto(d.toObject()));
  }

  // 定时任务:每 10 分钟扫描 enabled 任务(简化版,只做 tick)
  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduledTick() {
    const tasks = await this.taskModel.find({ enabled: true, 'schedule.enabled': true, 'schedule.cron': { $exists: true } });
    // 简化: 不真做 cron 表达式匹配,只做标记
    this.logger.debug(`Discovery scheduled tick: ${tasks.length} enabled tasks`);
  }

  // ============ DTO ============
  private toTaskDto(d: any) {
    return {
      id: d._id?.toString(),
      name: d.name,
      protocol: d.protocol,
      target: d.target,
      credentials: d.credentials ? { ...d.credentials, password: d.credentials.password ? '***' : undefined, privateKey: d.credentials.privateKey ? '***' : undefined } : undefined,
      schedule: d.schedule,
      modelUid: d.modelUid,
      fieldMapping: d.fieldMapping,
      filters: d.filters,
      conflictPolicy: d.conflictPolicy,
      status: d.status,
      lastRunAt: d.lastRunAt,
      lastRunStats: d.lastRunStats,
      requireApproval: d.requireApproval,
      enabled: d.enabled,
      createdBy: d.createdBy,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  private toRunDto(d: any) {
    return {
      id: d._id?.toString(),
      taskId: d.taskId?.toString(),
      taskName: d.taskName,
      trigger: d.trigger,
      startedAt: d.startedAt,
      finishedAt: d.finishedAt,
      status: d.status,
      progress: d.progress,
      logs: d.logs,
      result: d.result,
      error: d.error,
      durationMs: d.durationMs,
    };
  }
}
