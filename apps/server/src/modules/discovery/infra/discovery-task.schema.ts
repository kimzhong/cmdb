/**
 * DiscoveryTask Mongoose Schema
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type DiscoveryTaskDocument = HydratedDocument<DiscoveryTask>;

@Schema({ collection: 'discovery_tasks', timestamps: true })
export class DiscoveryTask {
  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, enum: ['ssh', 'snmp', 'ipmi', 'http', 'agent', 'mock'], required: true, index: true })
  protocol!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  target!: { type: 'ip_range' | 'host_list' | 'subnet' | 'agent_id'; ipRange?: { start: string; end: string }; hostList?: string[]; subnetId?: string };

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  credentials!: { username?: string; password?: string; privateKey?: string; port?: number; snmpCommunity?: string; snmpVersion?: 'v1' | 'v2c' | 'v3' };

  @Prop({ type: MongooseSchema.Types.Mixed, default: { enabled: true, onDemand: true } })
  schedule!: { enabled: boolean; cron?: string; onDemand: boolean };

  @Prop({ type: String, required: true, index: true })
  modelUid!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  fieldMapping!: Record<string, string>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  filters?: { excludeIpPatterns?: string[]; requireMinMemoryMB?: number };

  @Prop({ type: String, enum: ['overwrite', 'merge', 'skip', 'report'], default: 'merge' })
  conflictPolicy!: string;

  @Prop({ type: String, enum: ['idle', 'running', 'success', 'failed', 'partial', 'disabled'], default: 'idle', index: true })
  status!: string;

  @Prop({ type: Date })
  lastRunAt?: Date;

  @Prop({ type: MongooseSchema.Types.Mixed })
  lastRunStats?: { totalHosts: number; successHosts: number; failedHosts: number; newResources: number; updatedResources: number; conflicts: number };

  @Prop({ type: Boolean, default: false })
  requireApproval!: boolean;

  @Prop({ type: Boolean, default: true })
  enabled!: boolean;

  @Prop({ type: String, required: true })
  createdBy!: string;
}

export const DiscoveryTaskSchema = SchemaFactory.createForClass(DiscoveryTask);
DiscoveryTaskSchema.index({ enabled: 1, status: 1 });
