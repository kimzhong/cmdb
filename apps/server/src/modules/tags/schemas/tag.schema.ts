import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type TagKeyDocument = TagKey & Document;
export type TagValueDocument = TagValue & Document;
export type TagBindingDocument = TagBinding & Document;

/** 标签键 */
@Schema({ collection: 'tag_keys', timestamps: true, id: false })
export class TagKey {
  @ApiProperty({ description: '键名（唯一）', example: 'environment' })
  @Prop({ required: true, unique: true, trim: true })
  uid!: string;

  @ApiProperty({ description: '说明' })
  @Prop({ required: true })
  name!: string;

  @ApiProperty({ description: '描述', required: false })
  @Prop()
  description?: string;
}
export const TagKeySchema = SchemaFactory.createForClass(TagKey);

/** 标签值：属于某个 TagKey，可绑多个资源 */
@Schema({ collection: 'tag_values', timestamps: true, id: false })
export class TagValue {
  @ApiProperty({ description: '所属标签键 ID' })
  @Prop({ type: Types.ObjectId, ref: 'TagKey', required: true, index: true })
  keyId!: Types.ObjectId;

  @ApiProperty({ description: '值', example: 'prod' })
  @Prop({ required: true, trim: true })
  value!: string;

  @ApiProperty({ description: '描述', required: false })
  @Prop()
  description?: string;
}
export const TagValueSchema = SchemaFactory.createForClass(TagValue);

// 同一个 (keyId, value) 唯一
TagValueSchema.index({ keyId: 1, value: 1 }, { unique: true });

/** 资源 ↔ 标签值 的多对多绑定（跨模型通用） */
@Schema({ collection: 'tag_bindings', timestamps: true, id: false })
export class TagBinding {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'TagValue', required: true, index: true })
  tagValueId!: Types.ObjectId;

  @ApiProperty()
  @Prop({ required: true, index: true })
  modelUid!: string;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, required: true, index: true })
  resourceId!: Types.ObjectId;
}
export const TagBindingSchema = SchemaFactory.createForClass(TagBinding);
TagBindingSchema.index({ tagValueId: 1, modelUid: 1, resourceId: 1 }, { unique: true });
TagBindingSchema.index({ modelUid: 1, resourceId: 1 });

/** 启动时自动注入的标签键 */
export const BUILTIN_TAG_KEYS: Array<Pick<TagKey, 'uid' | 'name' | 'description'>> = [
  { uid: 'environment', name: '环境', description: 'test / pre / prod 等环境标识' },
];
