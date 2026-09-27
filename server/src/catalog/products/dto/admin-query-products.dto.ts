import { ApiProperty } from '@nestjs/swagger';
import { PublishStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { QueryProductsDto } from './query-products.dto';

export class AdminQueryProductsDto extends QueryProductsDto {
  @ApiProperty({ required: false, enum: PublishStatus })
  @IsOptional()
  @IsEnum(PublishStatus)
  publishStatus?: PublishStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;
}
