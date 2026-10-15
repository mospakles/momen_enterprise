import { ApiProperty } from '@nestjs/swagger';
import { ReviewFit } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsString() @MinLength(1) customerName!: string;
  @ApiProperty() @IsEmail() customerEmail!: string;
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() title?: string;
  @ApiProperty() @IsString() @MinLength(1) body!: string;
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ enum: ReviewFit, required: false })
  @IsOptional()
  @IsEnum(ReviewFit)
  fit?: ReviewFit;
}
