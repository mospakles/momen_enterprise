import { ApiProperty } from '@nestjs/swagger';
import { Garment, MeasurementUnit } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertMeasurementFieldDefDto {
  @ApiProperty({
    description:
      'Stable key, e.g. "chest" — also usable for custom admin-defined fields',
  })
  @IsString()
  @MinLength(1)
  key!: string;

  @ApiProperty() @IsString() @MinLength(1) label!: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  instructions?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  commonMistakes?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  illustration?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() videoUrl?: string;
  @ApiProperty({ enum: MeasurementUnit, default: MeasurementUnit.cm })
  @IsEnum(MeasurementUnit)
  unit!: MeasurementUnit;
  @ApiProperty({ default: false }) @IsBoolean() required!: boolean;

  @ApiProperty({ enum: Garment, isArray: true })
  @IsArray()
  @IsEnum(Garment, { each: true })
  garments!: Garment[];

  @ApiProperty({ default: 0 }) @IsInt() @Min(0) sortOrder!: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() minCm?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() maxCm?: number;
}
