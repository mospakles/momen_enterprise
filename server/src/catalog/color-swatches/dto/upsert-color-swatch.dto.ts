import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class UpsertColorSwatchDto {
  @ApiProperty() @IsString() @MinLength(1) name!: string;
  @ApiProperty() @IsString() hex!: string;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) sortOrder!: number;
}
