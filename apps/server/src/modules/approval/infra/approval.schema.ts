/**
 * Approval Mongoose Schema
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ApprovalDocument = HydratedDocument<Approval>;

@Schema({ collection: 'approvals', timestamps: true, _id: true })
export class Approval {
  @Prop({ type: String, required: true, unique: true, index: true })
  ticketNo!: string;

  @Prop({ type: String, required: true, index: true })
  type!: string;

  @Prop({ type: String, required: true })
  targetType!: string;

  @Prop({ type: String, required: true, index: true })
  targetId!: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  payload!: any;

  @Prop({ type: MongooseSchema.Types.Mixed })
  diff?: any;

  @Prop({ type: String, required: true, index: true })
  requesterId!: string;

  @Prop({ type: String, required: true })
  requesterName!: string;

  @Prop({ type: String, required: true })
  policyId!: string;

  @Prop({ type: Number, default: 0 })
  currentStep!: number;

  @Prop({ type: Number, required: true })
  totalSteps!: number;

  @Prop({ type: String, enum: ['pending', 'approved', 'rejected', 'cancelled', 'expired', 'applied'], default: 'pending', index: true })
  status!: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  decisions!: any[];

  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;

  @Prop({ type: Date })
  appliedAt?: Date;

  @Prop({ type: MongooseSchema.Types.Mixed })
  result?: { success: boolean; error?: string };
}

export const ApprovalSchema = SchemaFactory.createForClass(Approval);
ApprovalSchema.index({ status: 1, createdAt: -1 });
ApprovalSchema.index({ requesterId: 1, status: 1 });
ApprovalSchema.index({ targetType: 1, targetId: 1 });
ApprovalSchema.index({ expiresAt: 1 });
