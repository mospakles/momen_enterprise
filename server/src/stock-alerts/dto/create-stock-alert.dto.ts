import { ApiProperty } from '@nestjs/swagger';
import { StockAlertKind } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStockAlertDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty({ enum: StockAlertKind }) @IsEnum(StockAlertKind) kind!: StockAlertKind;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(40) size?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(60) color?: string;
}
