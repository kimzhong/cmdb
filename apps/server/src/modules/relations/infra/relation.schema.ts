/**
 * Relation Mongoose Schema
 * 关系实例(边表),独立 collection
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type RelationDocument = HydratedDocument<Relation>;

@Schema({ collection: 'relations', timestamps: true })
export class Relation {
  @Prop({ type: String, required: true, index: true })
  sourceId!: string;

  @Prop({ type: String, required: true })
  sourceType!: string;

  @Prop({ type: String, required: true, index: true })
  targetId!: string;

  @Prop({ type: String, required: true })
  targetType!: string;

  @Prop({ type: String, required: true, index: true })
  relationType!: string;

  @Prop({ type: String })
  inverseRelationType?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  attributes?: Record<string, any>;

  @Prop({ type: Boolean, default: false })
  isAutoDiscovered!: boolean;

  @Prop({ type: String, enum: ['active', 'pending', 'archived'], default: 'active', index: true })
  status!: 'active' | 'pending' | 'archived';

  @Prop({ type: String, required: true })
  createdBy!: string;

  @Prop({ type: String })
  updatedBy?: string;
}

export const RelationSchema = SchemaFactory.createForClass(Relation);
RelationSchema.index({ sourceType: 1, sourceId: 1, relationType: 1, status: 1 });
RelationSchema.index({ targetType: 1, targetId: 1, relationType: 1, status: 1 });
RelationSchema.index({ sourceType: 1, sourceId: 1, status: 1 });
RelationSchema.index({ targetType: 1, targetId: 1, status: 1 });
RelationSchema.index({ relationType: 1, status: 1 });
RelationSchema.index({ createdAt: -1 });
// 防重复:同 source+target+type 不重复
RelationSchema.index(
  { sourceId: 1, targetId: 1, relationType: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);
