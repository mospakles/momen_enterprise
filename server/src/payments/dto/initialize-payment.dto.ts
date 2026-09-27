import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

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
}
