import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsString, Min, MinLength } from 'class-validator';

export class UpsertFaqDto {
  @ApiProperty() @IsString() @MinLength(1) question!: string;
  @ApiProperty() @IsString() @MinLength(1) answer!: string;
  @ApiProperty() @IsString() category!: string;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) sortOrder!: number;
  @ApiProperty({ default: false }) @IsBoolean() published!: boolean;
}
