import { ApiProperty } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class InitializePaymentDto {
  @ApiProperty()
  @IsString()
  orderId!: string;

  @ApiProperty({
    required: false,
    description:
      "Required for guest orders — must match the order's customerEmail",
  })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiProperty({ required: false, enum: [PaymentProvider.paystack, PaymentProvider.flutterwave] })
  @IsOptional()
  @IsIn([PaymentProvider.paystack, PaymentProvider.flutterwave])
  provider?: PaymentProvider;
}
