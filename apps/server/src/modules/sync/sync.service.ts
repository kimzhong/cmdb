import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import {
  SyncTask,
  SyncTaskDocument,
  SyncLog,
  SyncLogDocument,
  SyncStatus,
} from './schemas/sync.schema';
import { CreateSyncTaskDto, UpdateSyncTaskDto } from './dto/sync.dto';
import { CloudProvider, RemoteResource, SyncContext } from './providers/cloud-provider.interface';
import { MockProvider } from './providers/mock.provider';
import { ModelsService } from '../meta-model/models/models.service';
import { DynamicSchemaFactory } from '../resources/dynamic-schema.factory';
import { WebhookNotifier } from './notifier/webhook.notifier';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly providers: Map<string, CloudProvider>;

  constructor(
    @InjectModel(SyncTask.name) private readonly taskModel: Model<SyncTaskDocument>,
    @InjectModel(SyncLog.name) private readonly logModel: Model<SyncLogDocument>,
    private readonly modelsService: ModelsService,
    private readonly dynamicFactory: DynamicSchemaFactory,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notifier: WebhookNotifier,
    mock: MockProvider,
  ) {
    this.providers = new Map();
    this.providers.set(mock.name, mock);
  }

  // ---- 任务 CRUD ----
  async listTasks(): Promise<SyncTask[]> {
    const tasks = await this.taskModel.find().sort({ createdAt: -1 }).lean();
    return tasks;
  }

  async createTask(dto: CreateSyncTaskDto): Promise<SyncTask> {
    // 校验 model 存在
    await this.modelsService.findByUid(dto.modelUid);
    const created = await this.taskModel.create(dto);
    if (created.enabled !== false) {
      this.scheduleTask(created);
    }
    return created.toObject();
  }

  async updateTask(id: string, dto: UpdateSyncTaskDto): Promise<SyncTask> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const found = await this.taskModel.findById(id);
    if (!found) throw new NotFoundException(`任务 ${id} 不存在`);
    Object.assign(found, dto);
    await found.save();
    // 重新调度
    this.unscheduleTask(found._id.toString());
    if (found.enabled !== false) this.scheduleTask(found);
    return found.toObject();
  }

  async removeTask(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const found = await this.taskModel.findById(id);
    if (!found) throw new NotFoundException(`任务 ${id} 不存在`);
    this.unscheduleTask(found._id.toString());
    await this.taskModel.deleteOne({ _id: found._id });
  }

  async trigger(id: string): Promise<{ logId: string }> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('id 非法');
    const task = await this.taskModel.findById(id);
    if (!task) throw new NotFoundException(`任务 ${id} 不存在`);
    // 异步执行，立即返回 logId
    this.runTask(task.toObject() as SyncTask).catch((e) =>
      this.logger.error(`runTask error: ${(e as Error).message}`),
    );
    return { logId: 'pending' };
  }

  // ---- 日志 ----
  async listLogs(filter: { taskId?: string; page?: number; pageSize?: number }) {
    const q: Record<string, unknown> = {};
    if (filter.taskId) {
      if (!Types.ObjectId.isValid(filter.taskId)) throw new BadRequestException('taskId 非法');
      q.taskId = new Types.ObjectId(filter.taskId);
    }
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 20));
    const [list, total] = await Promise.all([
      this.logModel.find(q).sort({ startedAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      this.logModel.countDocuments(q),
    ]);
    return { list, total, page, pageSize };
  }

  // ---- 调度 ----
  /** 启动时为已启用的任务注册 cron */
  async onModuleInit() {
    const tasks = await this.taskModel.find({ enabled: { $ne: false } }).lean();
    for (const t of tasks) this.scheduleTask(t as unknown as SyncTask);
    this.logger.log(`定时任务调度器就绪，已注册 ${tasks.length} 个任务`);
  }

  private scheduleTask(task: SyncTask) {
    const id = (task as unknown as { _id: { toString(): string } })._id.toString();
    const name = `sync_${id}`;
    if (this.schedulerRegistry.doesExist('cron', name)) {
      this.unscheduleTask(id);
    }
    const job = new CronJob(task.cron, () => {
      this.runTask(task).catch((e) => this.logger.error(e));
    });
    this.schedulerRegistry.addCronJob(name, job as never);
    job.start();
    this.logger.log(`scheduled: ${task.name} (${task.cron})`);
  }

  private unscheduleTask(id: string) {
    const name = `sync_${id}`;
    if (this.schedulerRegistry.doesExist('cron', name)) {
      this.schedulerRegistry.deleteCronJob(name);
    }
  }

  // ---- 核心执行 ----
  async runTask(task: SyncTask): Promise<SyncLog> {
    const taskId = (task as unknown as { _id: Types.ObjectId })._id;
    const log = await this.logModel.create({
      taskId,
      startedAt: new Date(),
      status: SyncStatus.Running,
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    });

    try {
      const provider = this.providers.get(task.provider);
      if (!provider) throw new Error(`未注册的 provider: ${task.provider}`);

      const def = await this.modelsService.findByUid(task.modelUid);
      const ctx: SyncContext = {
        taskId: taskId.toString(),
        modelUid: task.modelUid,
        region: task.region,
        resourceType: task.resourceType,
        fieldMapping: (task.fieldMapping ?? []).map((m) => ({ remote: m.remote, local: m.local })),
        uniqueKey: task.uniqueKey ?? 'uid',
        syncMode: task.syncMode,
      };

      const remoteList: RemoteResource[] = await provider.fetch(ctx);
      log.total = remoteList.length;

      const M = await this.dynamicFactory.getModelFor(def);
      const uniqueKey = ctx.uniqueKey;

      for (const remote of remoteList) {
        try {
          const doc: Record<string, unknown> = { _syncedAt: new Date() };
          // 只按 fieldMapping 写入；uniqueKey 单独保证
          for (const m of ctx.fieldMapping) {
            if (m.remote in remote) doc[m.local] = remote[m.remote];
          }
          const uniqVal = doc[uniqueKey];
          if (uniqVal === undefined || uniqVal === null) {
            log.skipped++;
            continue;
          }
          const existed = await M.findOne({ [uniqueKey]: uniqVal }).lean();
          if (existed) {
            await M.updateOne({ [uniqueKey]: uniqVal }, { $set: doc });
            log.updated++;
          } else {
            await M.create(doc);
            log.created++;
          }
        } catch (e) {
          this.logger.warn(`sync item failed: ${(e as Error).message}`);
          log.failed++;
        }
      }

      log.status = SyncStatus.Success;
      log.finishedAt = new Date();
      await log.save();

      await this.taskModel.updateOne(
        { _id: taskId },
        { $set: { status: SyncStatus.Success, lastRunAt: new Date() } },
      );

      return log.toObject();
    } catch (e) {
      log.status = SyncStatus.Failed;
      log.finishedAt = new Date();
      log.error = (e as Error).message.slice(0, 500);
      await log.save();
      await this.taskModel.updateOne(
        { _id: taskId },
        { $set: { status: SyncStatus.Failed, lastRunAt: new Date() } },
      );
      await this.notifier.notify({
        title: `[CMDB Sync FAILED] ${task.name}`,
        text: log.error,
        meta: { taskId: taskId.toString(), modelUid: task.modelUid },
      });
      throw e;
    }
  }
}
