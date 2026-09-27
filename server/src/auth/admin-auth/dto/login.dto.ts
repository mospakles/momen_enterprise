import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiProperty({
    required: false,
    description: '6-digit TOTP code, required when the account has 2FA enabled',
  })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}
