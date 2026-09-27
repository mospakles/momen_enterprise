import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsString, Min, MinLength } from 'class-validator';

export class UpsertSizeOptionDto {
  @ApiProperty() @IsString() @MinLength(1) label!: string;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) sortOrder!: number;
  @ApiProperty({ default: true }) @IsBoolean() active!: boolean;
}
