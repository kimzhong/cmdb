import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type BizDocument = Biz & Document;
export type AppDocument = App & Document;
export type AppResourceBindingDocument = AppResourceBinding & Document;

/** 业务（应用的上级） */
@Schema({ collection: 'biz', timestamps: true })
export class Biz {
  @ApiProperty({ description: '业务名' })
  @Prop({ required: true, trim: true })
  name!: string;

  @ApiProperty({ description: '唯一标识' })
  @Prop({ required: true, unique: true, trim: true })
  uid!: string;

  @ApiProperty({ description: '描述', required: false })
  @Prop()
  description?: string;

  @ApiProperty({ description: '排序', default: 0 })
  @Prop({ default: 0 })
  order!: number;
}
export const BizSchema = SchemaFactory.createForClass(Biz);

/** 应用（归属某个业务） */
@Schema({ collection: 'app', timestamps: true })
export class App {
  @ApiProperty({ description: '所属业务 ID' })
  @Prop({ type: Types.ObjectId, ref: 'Biz', required: true, index: true })
  bizId!: Types.ObjectId;

  @ApiProperty({ description: '唯一标识（英文）' })
  @Prop({ required: true, unique: true, trim: true })
  uid!: string;

  @ApiProperty({ description: '应用名' })
  @Prop({ required: true, trim: true })
  name!: string;

  @ApiProperty({ description: '状态：pending / running / offline' })
  @Prop({ default: 'pending' })
  status!: string;

  @ApiProperty({ description: '描述', required: false })
  @Prop()
  description?: string;
}
export const AppSchema = SchemaFactory.createForClass(App);

/** 应用 ↔ 资源 绑定 */
@Schema({ collection: 'app_resource_bindings', timestamps: true })
export class AppResourceBinding {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'App', required: true, index: true })
  appId!: Types.ObjectId;

  @ApiProperty()
  @Prop({ required: true, index: true })
  modelUid!: string;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, required: true, index: true })
  resourceId!: Types.ObjectId;
}
export const AppResourceBindingSchema = SchemaFactory.createForClass(AppResourceBinding);
AppResourceBindingSchema.index({ appId: 1, modelUid: 1, resourceId: 1 }, { unique: true });
