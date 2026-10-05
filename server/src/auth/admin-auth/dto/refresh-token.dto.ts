import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ required: false, description: 'Optional for browser cookie sessions' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
