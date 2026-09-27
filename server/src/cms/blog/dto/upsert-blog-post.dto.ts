import { ApiProperty } from '@nestjs/swagger';
import { PublishStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SeoDto } from '../../../catalog/products/dto/product-relations.dto';

export class UpsertBlogPostDto {
  @ApiProperty() @IsString() @MinLength(1) slug!: string;
  @ApiProperty() @IsString() @MinLength(1) title!: string;
  @ApiProperty() @IsString() excerpt!: string;
  @ApiProperty() @IsString() body!: string;
  @ApiProperty() @IsString() coverImage!: string;
  @ApiProperty() @IsString() author!: string;
  @ApiProperty({ enum: PublishStatus, default: PublishStatus.draft })
  @IsEnum(PublishStatus)
  status!: PublishStatus;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  publishAt?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @ApiProperty({ type: SeoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  seo?: SeoDto;
}
