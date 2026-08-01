import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsOptional, IsString, Length } from 'class-validator';

export class CreateTagKeyDto {
  @ApiProperty({ description: '键名（英文/数字/下划线）', example: 'environment' })
  @IsString()
  @Length(2, 32)
  uid!: string;

  @ApiProperty({ description: '显示名' })
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  description?: string;
}

export class CreateTagValueDto {
  @ApiProperty({ description: '所属标签键 ID' })
  @IsMongoId()
  keyId!: string;

  @ApiProperty({ description: '值' })
  @IsString()
  @Length(1, 64)
  value!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class BindResourcesDto {
  @ApiProperty({ description: '目标资源 [{modelUid, resourceId}, ...]' })
  @IsArray()
  resources!: Array<{ modelUid: string; resourceId: string }>;
}
