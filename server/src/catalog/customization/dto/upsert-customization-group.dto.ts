import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CustomizationChoiceDto {
  @ApiProperty() @IsString() @MinLength(1) label!: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() image?: string;
  @ApiProperty({ default: 0 }) @IsNumber() @Min(0) additionalCost!: number;
  @ApiProperty({ default: true }) @IsBoolean() available!: boolean;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) sortOrder!: number;
}

export class UpsertCustomizationGroupDto {
  @ApiProperty() @IsString() @MinLength(1) name!: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [CustomizationChoiceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomizationChoiceDto)
  choices!: CustomizationChoiceDto[];
}
