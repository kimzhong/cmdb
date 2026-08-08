/**
 * BulkIo 应用服务
 * 导入/导出任务
 *
 * 简化实现: 不引 Excel 解析库,只接受 JSON 数组(前端解析)
 * 生产可扩展: 加 xlsx 库支持 .xlsx 文件
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ImportJob, ImportJobDocument } from '../infra/import-job.schema';
import { ExportJob, ExportJobDocument } from '../infra/export-job.schema';
import { ModelsService } from '../../meta-model/models/models.service';
import { DynamicSchemaFactory } from '../../resources/dynamic-schema.factory';
import { LifecycleState } from '@cmdb/shared/types';
import { generateTemplateColumns, renderCsvTemplate, TemplateColumn } from '../domain/template-generator';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '@cmdb/shared/types/error-code';

export interface ImportRow {
  rowIndex: number;
  data: Record<string, any>;
  uid?: string; // 已存在的资源 uid(用于 update)
}

export interface ImportOptions {
  modelUid: string;
  mode: 'create_only' | 'upsert' | 'update_only';
  dryRun: boolean;
  uploadedBy: string;
  fileName: string;
  fileSize: number;
  rows: ImportRow[];
  fieldMapping?: Record<string, string>;
}

@Injectable()
export class BulkIoService {
  constructor(
    @InjectModel(ImportJob.name) private readonly importModel: Model<ImportJobDocument>,
    @InjectModel(ExportJob.name) private readonly exportModel: Model<ExportJobDocument>,
    private readonly modelsService: ModelsService,
    private readonly factory: DynamicSchemaFactory,
  ) {}

  // ============ Template ============
  async getTemplate(modelUid: string): Promise<{ columns: TemplateColumn[]; csv: string; modelName: string }> {
    const def = await this.modelsService.findByUid(modelUid);
    const columns = generateTemplateColumns(def);
    const csv = renderCsvTemplate(columns);
    return { columns, csv, modelName: def.name };
  }

  // ============ Import ============
  async createImportJob(opts: ImportOptions) {
    const def = await this.modelsService.findByUid(opts.modelUid);
    if (!def) throw new NotFoundException(`模型 ${opts.modelUid} 不存在`);

    // 1. 创建 job(立即落盘,状态 pending)
    const job = await this.importModel.create({
      modelUid: opts.modelUid,
      fileName: opts.fileName,
      fileSize: opts.fileSize,
      uploadedBy: opts.uploadedBy,
      mode: opts.mode,
      dryRun: opts.dryRun,
      fieldMapping: opts.fieldMapping,
      status: 'pending',
      progress: { total: opts.rows.length, processed: 0, success: 0, failed: 0 },
      errors: [],
    });

    // 2. 异步处理(setImmediate 避免阻塞)
    setImmediate(() => this.processImportJob(job._id.toString(), opts, def).catch((e) => {
      // eslint-disable-next-line no-console
      console.error('Import job failed:', e);
    }));

    return this.toImportDto(job.toObject());
  }

  private async processImportJob(jobId: string, opts: ImportOptions, def: any) {
    await this.importModel.findByIdAndUpdate(jobId, { status: 'processing', startedAt: new Date() });
    const M = await this.factory.getModelFor(def);
    let success = 0, failed = 0;
    const errors: any[] = [];

    for (let i = 0; i < opts.rows.length; i++) {
      const row = opts.rows[i];
      try {
        if (opts.mode === 'create_only' || opts.mode === 'upsert') {
          const data: any = { ...row.data, lifecycle: { state: LifecycleState.IN_USE, enteredAt: new Date(), enteredBy: opts.uploadedBy }, createdBy: opts.uploadedBy };
          if (!data.uid) data.uid = new Types.ObjectId().toString();
          if (!opts.dryRun) {
            if (opts.mode === 'upsert') {
              await M.updateOne({ uid: data.uid }, { $set: data }, { upsert: true });
            } else {
              await M.create(data);
            }
          }
        }
        if (opts.mode === 'update_only' && row.uid) {
          if (!opts.dryRun) await M.updateOne({ uid: row.uid }, { $set: row.data });
        }
        success++;
      } catch (e: any) {
        failed++;
        errors.push({ row: i, message: e.message });
      }
    }
    await this.importModel.findByIdAndUpdate(jobId, {
      status: failed === 0 ? 'completed' : 'partial',
      progress: { total: opts.rows.length, processed: opts.rows.length, success, failed },
      errors: errors.slice(0, 100), // 只保留前 100 条错误
      finishedAt: new Date(),
      durationMs: Date.now() - new Date().getTime(),
    });
  }

  async getImportJob(id: string) {
    const job = await this.importModel.findById(id);
    if (!job) throw new NotFoundException(`导入任务 ${id} 不存在`);
    return this.toImportDto(job.toObject());
  }

  async listImportJobs(filter: { modelUid?: string; status?: string } = {}) {
    const q: any = {};
    if (filter.modelUid) q.modelUid = filter.modelUid;
    if (filter.status) q.status = filter.status;
    const docs = await this.importModel.find(q).sort({ createdAt: -1 }).limit(50).exec();
    return docs.map((d) => this.toImportDto(d.toObject()));
  }

  // ============ Export ============
  async createExportJob(opts: { modelUid: string; format: 'xlsx' | 'csv' | 'json'; filters?: any; fields?: string[]; createdBy: string }) {
    const def = await this.modelsService.findByUid(opts.modelUid);
    if (!def) throw new NotFoundException(`模型 ${opts.modelUid} 不存在`);

    const job = await this.exportModel.create({
      ...opts,
      status: 'pending',
    });
    setImmediate(() => this.processExportJob(job._id.toString(), opts, def).catch(console.error));
    return this.toExportDto(job.toObject());
  }

  private async processExportJob(jobId: string, opts: any, def: any) {
    await this.exportModel.findByIdAndUpdate(jobId, { status: 'processing', startedAt: new Date() });
    const M = await this.factory.getModelFor(def);
    const docs: any[] = await M.find(opts.filters || {}).lean();
    let content = '';
    if (opts.format === 'json') {
      content = JSON.stringify(docs, null, 2);
    } else if (opts.format === 'csv') {
      const fields: string[] = opts.fields && opts.fields.length > 0 ? opts.fields : Object.keys(docs[0] || {});
      const header = fields.join(',');
      const rows = docs.map((d: any) => fields.map((f: string) => JSON.stringify(d[f] ?? '')).join(','));
      content = [header, ...rows].join('\n');
    } else {
      // xlsx: 简化, 用 markdown 表格代替
      const fields: string[] = opts.fields && opts.fields.length > 0 ? opts.fields : Object.keys(docs[0] || {});
      const header = '| ' + fields.join(' | ') + ' |';
      const sep = '| ' + fields.map(() => '---').join(' | ') + ' |';
      const rows = docs.map((d: any) => '| ' + fields.map((f: string) => String(d[f] ?? '')).join(' | ') + ' |');
      content = [header, sep, ...rows].join('\n');
    }
    // 简化:存到内存(in-memory 字典),生产用 OSS / 本地文件
    // 这里存到 process 全局 (单进程 OK, 多进程用 Redis)
    (global as any).__exportCache = (global as any).__exportCache || new Map();
    (global as any).__exportCache.set(jobId, content);
    await this.exportModel.findByIdAndUpdate(jobId, {
      status: 'completed',
      finishedAt: new Date(),
      totalRows: docs.length,
      fileKey: jobId,
      fileUrl: `/api/bulk-io/exports/${jobId}/download`,
    });
  }

  async getExportJob(id: string) {
    const job = await this.exportModel.findById(id);
    if (!job) throw new NotFoundException(`导出任务 ${id} 不存在`);
    return this.toExportDto(job.toObject());
  }

  async downloadExport(id: string): Promise<{ content: string; format: string; fileName: string }> {
    const job = await this.exportModel.findById(id);
    if (!job) throw new NotFoundException(`导出任务 ${id} 不存在`);
    if (job.status !== 'completed') throw new BusinessException(ErrorCode.EXPORT_JOB_NOT_FOUND, '导出任务未完成');
    const content = (global as any).__exportCache?.get(id);
    if (!content) throw new BusinessException(ErrorCode.EXPORT_JOB_NOT_FOUND, '导出内容已过期,请重新导出');
    return { content, format: job.format, fileName: `${job.modelUid}-${Date.now()}.${job.format === 'xlsx' ? 'md' : job.format}` };
  }

  // ============ DTO ============
  private toImportDto(d: any) {
    return {
      id: d._id?.toString(),
      modelUid: d.modelUid,
      fileName: d.fileName,
      fileSize: d.fileSize,
      uploadedBy: d.uploadedBy,
      mode: d.mode,
      dryRun: d.dryRun,
      status: d.status,
      progress: d.progress,
      errors: d.errors ?? [],
      startedAt: d.startedAt,
      finishedAt: d.finishedAt,
      durationMs: d.durationMs,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  private toExportDto(d: any) {
    return {
      id: d._id?.toString(),
      modelUid: d.modelUid,
      format: d.format,
      fields: d.fields ?? [],
      status: d.status,
      fileKey: d.fileKey,
      fileUrl: d.fileUrl,
      totalRows: d.totalRows,
      startedAt: d.startedAt,
      finishedAt: d.finishedAt,
      createdBy: d.createdBy,
      createdAt: d.createdAt,
    };
  }
}
