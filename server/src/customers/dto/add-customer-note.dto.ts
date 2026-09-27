import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AddCustomerNoteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  message!: string;
}
