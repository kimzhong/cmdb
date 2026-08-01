import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

/** 6 种字段类型 */
export enum FieldType {
  String = 'string',
  Number = 'number',
  Date = 'date',
  Select = 'select',
  Password = 'password',
  Relation = 'relation',
}

/** 关系类型 */
export enum RelationType {
  BelongsTo = 'belongsTo',
  Connects = 'connects',
}

@Schema({ _id: false })
export class FieldOption {
  @ApiProperty({ description: '选项 key' })
  @Prop({ required: true })
  key!: string;

  @ApiProperty({ description: '选项 value' })
  @Prop({ required: true })
  value!: string;
}
const FieldOptionSchema = SchemaFactory.createForClass(FieldOption);

/** 字段定义（嵌套在模型里） */
@Schema({ _id: false })
export class FieldDef {
  @ApiProperty({ description: '字段唯一标识', example: 'cpu' })
  @Prop({ required: true })
  uid!: string;

  @ApiProperty({ description: '字段显示名' })
  @Prop({ required: true })
  name!: string;

  @ApiProperty({ description: '字段类型', enum: FieldType })
  @Prop({ required: true, enum: Object.values(FieldType) })
  type!: FieldType;

  @ApiProperty({ description: '所属字段分组 uid' })
  @Prop({ required: true })
  groupUid!: string;

  @ApiProperty({ description: '排序', default: 0 })
  @Prop({ default: 0 })
  order!: number;

  @ApiProperty({ description: '是否必填', default: false })
  @Prop({ default: false })
  required!: boolean;

  @ApiProperty({ description: '是否内置（不可删）', default: false })
  @Prop({ default: false })
  builtin!: boolean;

  @ApiProperty({ description: '校验正则', required: false })
  @Prop()
  regex?: string;

  @ApiProperty({ description: '下拉选项（type=select）', type: [FieldOption], required: false })
  @Prop({ type: [FieldOptionSchema], default: [] })
  options!: FieldOption[];

  @ApiProperty({
    description: '关系类型（type=relation）',
    enum: RelationType,
    required: false,
  })
  @Prop({ enum: Object.values(RelationType) })
  relationType?: RelationType;

  @ApiProperty({ description: '关系目标模型 uid（type=relation）', required: false })
  @Prop()
  targetModelUid?: string;
}
const FieldDefSchema = SchemaFactory.createForClass(FieldDef);

/** 字段分组（嵌套在模型里） */
@Schema({ _id: false })
export class FieldGroup {
  @ApiProperty({ description: '分组唯一标识', example: 'basic' })
  @Prop({ required: true })
  uid!: string;

  @ApiProperty({ description: '分组显示名' })
  @Prop({ required: true })
  name!: string;

  @ApiProperty({ description: '排序', default: 0 })
  @Prop({ default: 0 })
  order!: number;

  @ApiProperty({ description: '是否内置（不可删）', default: false })
  @Prop({ default: false })
  builtin!: boolean;
}
const FieldGroupSchema = SchemaFactory.createForClass(FieldGroup);

export type ModelDocument = ModelDef & Document;

@Schema({ collection: 'meta_models', timestamps: true })
export class ModelDef {
  @ApiProperty({ description: '所属分类 ID' })
  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  categoryId!: Types.ObjectId;

  @ApiProperty({ description: '所属模型分组 ID' })
  @Prop({ type: Types.ObjectId, ref: 'ModelGroup', required: true, index: true })
  groupId!: Types.ObjectId;

  @ApiProperty({ description: '唯一标识', example: 'ecs' })
  @Prop({ required: true, unique: true, trim: true })
  uid!: string;

  @ApiProperty({ description: '名称' })
  @Prop({ required: true, trim: true })
  name!: string;

  @ApiProperty({ description: '描述', required: false })
  @Prop()
  description?: string;

  @ApiProperty({ description: '排序', default: 0 })
  @Prop({ default: 0 })
  order!: number;

  @ApiProperty({ description: '字段分组', type: [FieldGroup] })
  @Prop({ type: [FieldGroupSchema], default: [] })
  fieldGroups!: FieldGroup[];

  @ApiProperty({ description: '字段', type: [FieldDef] })
  @Prop({ type: [FieldDefSchema], default: [] })
  fields!: FieldDef[];
}

export const ModelSchema = SchemaFactory.createForClass(ModelDef);

// 模型创建时自动注入的字段分组 / 字段
export const BUILTIN_FIELD_GROUPS: Array<Pick<FieldGroup, 'uid' | 'name' | 'order' | 'builtin'>> = [
  { uid: 'basic', name: '基本属性', order: 1, builtin: true },
  { uid: 'relation', name: '关系属性', order: 99, builtin: true },
];

export const BUILTIN_FIELDS: Array<Pick<FieldDef, 'uid' | 'name' | 'type' | 'groupUid' | 'order' | 'builtin' | 'required'>> = [
  { uid: 'uid', name: '唯一标识', type: FieldType.String, groupUid: 'basic', order: 1, builtin: true, required: true },
  { uid: 'name', name: '名称', type: FieldType.String, groupUid: 'basic', order: 2, builtin: true, required: true },
];

export { FieldDefSchema, FieldGroupSchema };
