import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateExternalMediaDto {
  @ApiProperty() @IsString() @MinLength(1) name!: string;
  @ApiProperty() @IsUrl({ protocols: ['http', 'https'], require_protocol: true }) url!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() folder?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() alt?: string;
}
