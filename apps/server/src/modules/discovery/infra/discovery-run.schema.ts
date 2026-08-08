/**
 * DiscoveryRun Mongoose Schema
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type DiscoveryRunDocument = HydratedDocument<DiscoveryRun>;

@Schema({ collection: 'discovery_runs', timestamps: true, expires: '90d' })
export class DiscoveryRun {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'DiscoveryTask', index: true })
  taskId!: any;

  @Prop({ type: String, required: true })
  taskName!: string;

  @Prop({ type: String, enum: ['scheduled', 'manual', 'api'], required: true })
  trigger!: string;

  @Prop({ type: Date, required: true })
  startedAt!: Date;

  @Prop({ type: Date })
  finishedAt?: Date;

  @Prop({ type: String, enum: ['running', 'success', 'failed', 'partial', 'cancelled'], default: 'running', index: true })
  status!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: { total: 0, processed: 0, succeeded: 0, failed: 0 } })
  progress!: { total: number; processed: number; succeeded: number; failed: number };

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  logs!: any[];

  @Prop({ type: MongooseSchema.Types.Mixed })
  result?: { newResources: string[]; updatedResources: string[]; conflicts: any[] };

  @Prop({ type: String })
  error?: string;

  @Prop({ type: Number })
  durationMs?: number;
}

export const DiscoveryRunSchema = SchemaFactory.createForClass(DiscoveryRun);
DiscoveryRunSchema.index({ taskId: 1, startedAt: -1 });
