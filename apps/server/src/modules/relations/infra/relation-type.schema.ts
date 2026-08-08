/**
 * RelationType Mongoose Schema
 * 关系类型定义(系统预置 10 个 + 用户自定义)
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RelationTypeDocument = HydratedDocument<RelationType>;

@Schema({ collection: 'relation_types', timestamps: true })
export class RelationType {
  @Prop({ type: String, required: true, unique: true, index: true })
  code!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  inverseCode!: string;

  @Prop({ type: String })
  inverseName?: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, enum: ['1:1', '1:N', 'N:1', 'N:M'], required: true })
  cardinality!: '1:1' | '1:N' | 'N:1' | 'N:M';

  @Prop({ type: String })
  sourceTypeConstraint?: string;

  @Prop({ type: String })
  targetTypeConstraint?: string;

  @Prop({ type: String })
  sourceModelConstraint?: string;

  @Prop({ type: String })
  targetModelConstraint?: string;

  @Prop({ type: Boolean, default: false })
  bidirectional!: boolean;

  @Prop({ type: Boolean, default: false })
  isSystem!: boolean;

  @Prop({ type: String })
  icon?: string;

  @Prop({ type: String })
  color?: string;
}

export const RelationTypeSchema = SchemaFactory.createForClass(RelationType);
RelationTypeSchema.index({ code: 1 }, { unique: true });
RelationTypeSchema.index({ isSystem: 1 });
