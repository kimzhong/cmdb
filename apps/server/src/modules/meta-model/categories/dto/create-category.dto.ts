import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: '唯一标识（英文/数字/下划线）', example: 'asset' })
  @IsString()
  @Length(2, 32)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'uid 必须以小写字母开头，仅含小写字母、数字、下划线' })
  uid!: string;

  @ApiProperty({ description: '名称' })
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ description: '图标', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: '排序', default: 0, required: false })
  @IsOptional()
  @IsInt()
  order?: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiProperty({ description: '是否内置', required: false })
  @IsOptional()
  @IsBoolean()
  builtin?: boolean;
}
