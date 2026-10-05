import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CustomerRefreshTokenDto {
  @ApiProperty({ required: false, description: 'Optional for browser cookie sessions' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
