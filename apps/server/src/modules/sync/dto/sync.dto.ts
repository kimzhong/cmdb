import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsMongoId, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { SyncMode } from '../schemas/sync.schema';

export class FieldMappingDto {
  @ApiProperty()
  @IsString()
  remote!: string;

  @ApiProperty()
  @IsString()
  local!: string;
}

export class CreateSyncTaskDto {
  @ApiProperty()
  @IsString()
  @Length(1, 64)
  name!: string;

  @ApiProperty({ example: 'mock' })
  @IsString()
  provider!: string;

  @ApiProperty()
  @IsString()
  modelUid!: string;

  @ApiProperty({ example: '0 */1 * * * *', description: '6 段 cron（含秒）' })
  @IsString()
  cron!: string;

  @ApiProperty({ enum: SyncMode, required: false })
  @IsOptional()
  @IsIn(Object.values(SyncMode))
  syncMode?: SyncMode;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ required: false, description: '云资源类型，如 ECS / RDS' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiProperty({ required: false, type: [FieldMappingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingDto)
  fieldMapping?: FieldMappingDto[];

  @ApiProperty({ required: false, default: 'uid' })
  @IsOptional()
  @IsString()
  uniqueKey?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateSyncTaskDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cron?: string;

  @ApiProperty({ required: false, enum: SyncMode })
  @IsOptional()
  @IsIn(Object.values(SyncMode))
  syncMode?: SyncMode;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiProperty({ required: false, type: [FieldMappingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingDto)
  fieldMapping?: FieldMappingDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  uniqueKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class SyncLogQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  taskId?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  pageSize?: number;
}
