import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsMongoId, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateBizDto {
  @ApiProperty()
  @IsString()
  @Length(2, 32)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'uid 必须以小写字母开头' })
  uid!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  order?: number;
}

export class CreateAppDto {
  @ApiProperty()
  @IsMongoId()
  bizId!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 32)
  @Matches(/^[a-z][a-z0-9_]*$/)
  uid!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsIn(['pending', 'running', 'offline'])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class BindAppResourcesDto {
  @ApiProperty()
  @IsArray()
  resources!: Array<{ modelUid: string; resourceId: string }>;
}
