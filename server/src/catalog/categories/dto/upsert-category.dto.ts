import { ApiProperty } from '@nestjs/swagger';
import { PublishStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SeoDto } from '../../products/dto/product-relations.dto';

export class UpsertCategoryDto {
  @ApiProperty() @IsString() @MinLength(1) slug!: string;
  @ApiProperty() @IsString() @MinLength(1) name!: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() image?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() parentId?: string;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) sortOrder!: number;
  @ApiProperty({ enum: PublishStatus, default: PublishStatus.draft })
  @IsEnum(PublishStatus)
  publishStatus!: PublishStatus;

  @ApiProperty({ type: SeoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  seo?: SeoDto;
}
