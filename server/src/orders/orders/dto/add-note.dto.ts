import { ApiProperty } from '@nestjs/swagger';
import { NoteAudience } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class AddOrderNoteDto {
  @ApiProperty({ enum: NoteAudience })
  @IsEnum(NoteAudience)
  audience!: NoteAudience;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  message!: string;
}
