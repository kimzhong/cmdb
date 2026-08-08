/**
 * ApprovalPolicy Mongoose Schema
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ApprovalPolicyDocument = HydratedDocument<ApprovalPolicy>;

@Schema({ collection: 'approval_policies', timestamps: true, _id: true })
export class ApprovalPolicy {
  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  appliesTo!: { type: 'resource' | 'relation' | 'subnet'; modelUid?: string };

  @Prop({ type: String, required: true })
  trigger!: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  conditions!: any[];

  @Prop({ type: [MongooseSchema.Types.Mixed], required: true })
  steps!: any[];

  @Prop({ type: Boolean, default: true })
  enabled!: boolean;

  @Prop({ type: Number, default: 0 })
  priority!: number;

  @Prop({ type: Boolean, default: false })
  isSystem!: boolean;
}

export const ApprovalPolicySchema = SchemaFactory.createForClass(ApprovalPolicy);
ApprovalPolicySchema.index({ 'appliesTo.type': 1, enabled: 1, priority: -1 });
