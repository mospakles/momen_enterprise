import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertFabricDto {
  @ApiProperty() @IsString() @MinLength(1) name!: string;
  @ApiProperty() @IsString() category!: string;
  @ApiProperty() @IsString() image!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiProperty({ default: 0 }) @IsNumber() @Min(0) additionalCost!: number;
  @ApiProperty({ default: true }) @IsBoolean() available!: boolean;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) sortOrder!: number;
}
