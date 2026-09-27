import { ApiProperty } from '@nestjs/swagger';
import { PublishStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SeoDto } from '../../products/dto/product-relations.dto';

export class UpsertCollectionDto {
  @ApiProperty() @IsString() @MinLength(1) slug!: string;
  @ApiProperty() @IsString() @MinLength(1) name!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiProperty() @IsString() image!: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heroVideo?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() tag?: string;
  @ApiProperty({ enum: PublishStatus, default: PublishStatus.draft })
  @IsEnum(PublishStatus)
  publishStatus!: PublishStatus;
  @ApiProperty({ default: false }) @IsBoolean() expressEligible!: boolean;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) sortOrder!: number;

  @ApiProperty({ type: SeoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  seo?: SeoDto;
}
