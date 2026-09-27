import { ApiProperty } from '@nestjs/swagger';
import { RefundType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class RequestRefundDto {
  @ApiProperty({ enum: RefundType })
  @IsEnum(RefundType)
  type!: RefundType;

  @ApiProperty({
    required: false,
    description:
      'Required for a partial refund; full refunds use the order total',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  reason!: string;
}
