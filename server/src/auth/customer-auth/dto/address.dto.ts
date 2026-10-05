import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCustomerAddressDto {
  @ApiProperty() @IsString() @MinLength(1) fullName!: string;
  @ApiProperty() @IsString() @MinLength(1) country!: string;
  @ApiProperty() @IsString() @MinLength(1) state!: string;
  @ApiProperty() @IsString() @MinLength(1) city!: string;
  @ApiProperty() @IsString() @MinLength(1) address!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() apartment?: string;
  @ApiProperty() @IsString() postalCode!: string;
  @ApiProperty() @IsString() @MinLength(1) phone!: string;
  @ApiProperty({ required: false, default: false }) @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateCustomerAddressDto extends PartialType(CreateCustomerAddressDto) {}
