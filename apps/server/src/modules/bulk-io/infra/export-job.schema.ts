/**
 * ExportJob Mongoose Schema
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ExportJobDocument = HydratedDocument<ExportJob>;

@Schema({ collection: 'export_jobs', timestamps: true })
export class ExportJob {
  @Prop({ type: String, required: true, index: true })
  modelUid!: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  filters?: any;

  @Prop({ type: String, enum: ['xlsx', 'csv', 'json'], required: true })
  format!: string;

  @Prop({ type: [String], default: [] })
  fields!: string[];

  @Prop({ type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending', index: true })
  status!: string;

  @Prop({ type: String })
  fileKey?: string;

  @Prop({ type: String })
  fileUrl?: string;

  @Prop({ type: Number })
  totalRows?: number;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  finishedAt?: Date;

  @Prop({ type: String, required: true })
  createdBy!: string;
}

export const ExportJobSchema = SchemaFactory.createForClass(ExportJob);
