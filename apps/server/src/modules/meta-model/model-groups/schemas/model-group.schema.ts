import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ModelGroupDocument = ModelGroup & Document;

@Schema({ collection: 'meta_model_groups', timestamps: true })
export class ModelGroup {
  @ApiProperty({ description: '所属分类 ID' })
  @Prop({ type: Types.ObjectId, ref: 'Category', required: true, index: true })
  categoryId!: Types.ObjectId;

  @ApiProperty({ description: '唯一标识', example: 'server' })
  @Prop({ required: true, unique: true, trim: true })
  uid!: string;

  @ApiProperty({ description: '名称' })
  @Prop({ required: true, trim: true })
  name!: string;

  @ApiProperty({ description: '排序', default: 0 })
  @Prop({ default: 0 })
  order!: number;
}

export const ModelGroupSchema = SchemaFactory.createForClass(ModelGroup);
