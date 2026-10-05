import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsObject, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @ApiProperty({ type: Object })
  @IsObject()
  value!: Record<string, unknown>;
}

export class SubscribeNewsletterDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}

export class CreateContactMessageDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) topic!: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(5000) message!: string;
}
