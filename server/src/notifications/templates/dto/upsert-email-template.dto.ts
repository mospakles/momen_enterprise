import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, MinLength } from 'class-validator';

export class UpsertEmailTemplateDto {
  @ApiProperty() @IsString() @MinLength(1) key!: string;
  @ApiProperty() @IsString() @MinLength(1) name!: string;
  @ApiProperty() @IsString() @MinLength(1) subject!: string;
  @ApiProperty({ description: 'Supports {{variable}} tokens' })
  @IsString()
  body!: string;

  @ApiProperty({
    type: [String],
    description:
      'Documents which {{variable}} tokens this template expects — not enforced, just for the editor UI',
  })
  @IsArray()
  @IsString({ each: true })
  variables!: string[];
}
