import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class IssueGiftCardDto {
  @ApiProperty() @IsNumber() @Min(1) initialValue!: number;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() issuedTo?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  purchasedBy?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
