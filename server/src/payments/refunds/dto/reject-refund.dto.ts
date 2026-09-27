import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectRefundDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  reason!: string;
}
