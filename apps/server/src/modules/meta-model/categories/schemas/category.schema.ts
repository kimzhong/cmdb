import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { ModelCategory } from '@cmdb/shared';

export type CategoryDocument = Category & Document;

@Schema({ collection: 'meta_categories', timestamps: true })
export class Category {
  @ApiProperty({ description: '唯一标识', example: 'asset' })
  @Prop({ required: true, unique: true, trim: true })
  uid!: string;

  @ApiProperty({ description: '名称' })
  @Prop({ required: true, trim: true })
  name!: string;

  @ApiProperty({ description: '图标', required: false })
  @Prop()
  icon?: string;

  @ApiProperty({ description: '排序', default: 0 })
  @Prop({ default: 0 })
  order!: number;

  @ApiProperty({ description: '是否内置（内置不可删）', default: false })
  @Prop({ default: false })
  builtin!: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// 4 个内置分类初始化数据
export const BUILTIN_CATEGORIES: Array<Pick<Category, 'uid' | 'name' | 'order' | 'builtin' | 'icon'>> = [
  { uid: ModelCategory.Asset, name: '资产模型', icon: 'Database', order: 1, builtin: true },
  { uid: ModelCategory.Application, name: '应用模型', icon: 'Appstore', order: 2, builtin: true },
  { uid: ModelCategory.Organization, name: '组织模型', icon: 'Team', order: 3, builtin: true },
  { uid: ModelCategory.Other, name: '其他', icon: 'Ellipsis', order: 99, builtin: true },
];
