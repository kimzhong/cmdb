import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type SyncTaskDocument = SyncTask & Document;
export type SyncLogDocument = SyncLog & Document;

export enum SyncMode {
  Full = 'full',     // 全量
  Incremental = 'incremental', // 增量
}

export enum SyncStatus {
  Idle = 'idle',
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
}

/** 字段映射：远端字段 → 本地模型字段 uid */
@Schema({ _id: false })
export class FieldMapping {
  @ApiProperty({ description: '远端字段名' })
  @Prop({ required: true })
  remote!: string;

  @ApiProperty({ description: '本地模型字段 uid' })
  @Prop({ required: true })
  local!: string;
}
const FieldMappingSchema = SchemaFactory.createForClass(FieldMapping);

@Schema({ collection: 'sync_tasks', timestamps: true, id: false })
export class SyncTask {
  @ApiProperty({ description: '任务名' })
  @Prop({ required: true, trim: true })
  name!: string;

  @ApiProperty({ description: '云厂商 provider', example: 'mock / alicloud / tencent / aws' })
  @Prop({ required: true })
  provider!: string;

  @ApiProperty({ description: '目标模型 uid' })
  @Prop({ required: true, index: true })
  modelUid!: string;

  @ApiProperty({ description: 'cron 表达式', example: '0 */1 * * * *' })
  @Prop({ required: true })
  cron!: string;

  @ApiProperty({ description: '同步模式', enum: SyncMode })
  @Prop({ enum: Object.values(SyncMode), default: SyncMode.Full })
  syncMode!: SyncMode;

  @ApiProperty({ description: '远端 region/可用区' })
  @Prop()
  region?: string;

  @ApiProperty({ description: '云资源类型（ECS / RDS / ...）' })
  @Prop()
  resourceType?: string;

  @ApiProperty({ description: '字段映射', type: [FieldMapping] })
  @Prop({ type: [FieldMappingSchema], default: [] })
  fieldMapping!: FieldMapping[];

  @ApiProperty({ description: '唯一键字段（用于 upsert）' })
  @Prop({ default: 'uid' })
  uniqueKey!: string;

  @ApiProperty({ description: '状态' })
  @Prop({ enum: Object.values(SyncStatus), default: SyncStatus.Idle })
  status!: SyncStatus;

  @ApiProperty({ description: '最后执行时间' })
  @Prop()
  lastRunAt?: Date;

  @ApiProperty({ description: '是否启用' })
  @Prop({ default: true })
  enabled!: boolean;
}
export const SyncTaskSchema = SchemaFactory.createForClass(SyncTask);

@Schema({ collection: 'sync_logs', timestamps: true, id: false })
export class SyncLog {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'SyncTask', required: true, index: true })
  taskId!: Types.ObjectId;

  @ApiProperty({ description: '开始时间' })
  @Prop({ required: true })
  startedAt!: Date;

  @ApiProperty({ description: '结束时间' })
  @Prop()
  finishedAt?: Date;

  @ApiProperty({ description: '远端拉取条数' })
  @Prop({ default: 0 })
  total!: number;

  @ApiProperty({ description: '新增' })
  @Prop({ default: 0 })
  created!: number;

  @ApiProperty({ description: '更新' })
  @Prop({ default: 0 })
  updated!: number;

  @ApiProperty({ description: '跳过' })
  @Prop({ default: 0 })
  skipped!: number;

  @ApiProperty({ description: '失败' })
  @Prop({ default: 0 })
  failed!: number;

  @ApiProperty({ description: '状态', enum: SyncStatus })
  @Prop({ enum: Object.values(SyncStatus), required: true })
  status!: SyncStatus;

  @ApiProperty({ description: '错误信息', required: false })
  @Prop()
  error?: string;
}
export const SyncLogSchema = SchemaFactory.createForClass(SyncLog);
SyncLogSchema.index({ taskId: 1, startedAt: -1 });
