import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertTestimonialDto {
  @ApiProperty() @IsString() @MinLength(1) quote!: string;
  @ApiProperty() @IsString() @MinLength(1) author!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() role?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() image?: string;
  @ApiProperty({ required: false, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
  @ApiProperty({ default: false }) @IsBoolean() featured!: boolean;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) sortOrder!: number;
}
