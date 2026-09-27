import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ValidateCouponItemDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsInt() @Min(1) quantity!: number;
}

/** A checkout-preview endpoint — the order itself always re-validates and
 * re-computes the discount independently in OrdersService.create, so this
 * trusting a client-supplied subtotal is safe: nothing here is binding. */
export class ValidateCouponDto {
  @ApiProperty() @IsString() @MinLength(1) code!: string;
  @ApiProperty() @IsNumber() @Min(0) subtotal!: number;

  @ApiProperty({ type: [ValidateCouponItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateCouponItemDto)
  items!: ValidateCouponItemDto[];
}
