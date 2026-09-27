import { ApiProperty } from '@nestjs/swagger';
import { DiscountType, PromotionScope } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertCouponDto {
  @ApiProperty() @IsString() @MinLength(1) code!: string;
  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  type!: DiscountType;
  @ApiProperty() @IsNumber() @Min(0) value!: number;
  @ApiProperty({ enum: PromotionScope })
  @IsEnum(PromotionScope)
  scope!: PromotionScope;

  @ApiProperty({
    type: [String],
    required: false,
    description:
      'Product ids / collection slugs / customer ids, depending on scope',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopeRefs?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  perCustomerLimit?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startsAt?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
  @ApiProperty({ default: true }) @IsBoolean() active!: boolean;
}
