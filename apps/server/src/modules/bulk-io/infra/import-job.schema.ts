/**
 * ImportJob Mongoose Schema
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ImportJobDocument = HydratedDocument<ImportJob>;

@Schema({ collection: 'import_jobs', timestamps: true })
export class ImportJob {
  @Prop({ type: String, required: true, index: true })
  modelUid!: string;

  @Prop({ type: String, required: true })
  fileName!: string;

  @Prop({ type: Number, required: true })
  fileSize!: number;

  @Prop({ type: String })
  fileKey?: string;

  @Prop({ type: String, required: true })
  uploadedBy!: string;

  @Prop({ type: String, enum: ['create_only', 'upsert', 'update_only'], default: 'upsert' })
  mode!: string;

  @Prop({ type: Boolean, default: false })
  dryRun!: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed })
  fieldMapping?: Record<string, string>;

  @Prop({ type: String, enum: ['pending', 'processing', 'completed', 'failed', 'partial', 'cancelled'], default: 'pending', index: true })
  status!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: { total: 0, processed: 0, success: 0, failed: 0 } })
  progress!: { total: number; processed: number; success: number; failed: number };

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  errors!: any[];

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  finishedAt?: Date;

  @Prop({ type: Number })
  durationMs?: number;
}

export const ImportJobSchema = SchemaFactory.createForClass(ImportJob);
