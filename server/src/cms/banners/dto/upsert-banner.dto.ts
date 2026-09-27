import { ApiProperty } from '@nestjs/swagger';
import { BannerPlacement } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertBannerDto {
  @ApiProperty() @IsString() @MinLength(1) title!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() subtitle?: string;
  @ApiProperty() @IsString() image!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() ctaLabel?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() ctaHref?: string;
  @ApiProperty({ enum: BannerPlacement })
  @IsEnum(BannerPlacement)
  placement!: BannerPlacement;
  @ApiProperty({ default: true }) @IsBoolean() active!: boolean;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startsAt?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) sortOrder!: number;
}
