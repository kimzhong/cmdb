import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMongoId, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateModelGroupDto {
  @ApiProperty({ description: '所属分类 ID' })
  @IsMongoId()
  categoryId!: string;

  @ApiProperty({ description: '唯一标识（小写字母/数字/下划线）', example: 'server' })
  @IsString()
  @Length(2, 32)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'uid 必须以小写字母开头' })
  uid!: string;

  @ApiProperty({ description: '名称' })
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ description: '排序', default: 0, required: false })
  @IsOptional()
  @IsInt()
  order?: number;
}
