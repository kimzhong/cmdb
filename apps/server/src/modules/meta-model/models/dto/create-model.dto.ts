import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { FieldType, RelationType } from '../schemas/model.schema';

export class FieldOptionDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsString()
  value!: string;
}

export class FieldDefDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'uid 必须以小写字母开头' })
  uid!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ enum: FieldType })
  @IsIn(Object.values(FieldType))
  type!: FieldType;

  @ApiProperty()
  @IsString()
  groupUid!: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  regex?: string;

  @ApiProperty({ required: false, type: [FieldOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  options?: FieldOptionDto[];

  @ApiProperty({ required: false, enum: RelationType })
  @IsOptional()
  @IsIn(Object.values(RelationType))
  relationType?: RelationType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetModelUid?: string;
}

export class FieldGroupDto {
  @ApiProperty()
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'uid 必须以小写字母开头' })
  uid!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateModelDto {
  @ApiProperty({ description: '所属分类 ID' })
  @IsMongoId()
  categoryId!: string;

  @ApiProperty({ description: '所属模型分组 ID' })
  @IsMongoId()
  groupId!: string;

  @ApiProperty({ description: '唯一标识', example: 'ecs' })
  @IsString()
  @Length(2, 32)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'uid 必须以小写字母开头' })
  uid!: string;

  @ApiProperty({ description: '名称' })
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  order?: number;

  // 创建时可选地一起定义字段 / 字段分组（不传则使用内置）
  @ApiProperty({ required: false, type: [FieldGroupDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldGroupDto)
  fieldGroups?: FieldGroupDto[];

  @ApiProperty({ required: false, type: [FieldDefDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDefDto)
  fields?: FieldDefDto[];
}

export class UpdateModelDto extends PartialType(CreateModelDto) {}

// 单独的子操作 DTO：增删改一个字段
export class AddFieldDto extends FieldDefDto {}
export class UpdateFieldDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}

export class AddFieldGroupDto extends FieldGroupDto {}
