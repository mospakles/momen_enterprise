import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertDeliveryZoneDto {
  @ApiProperty() @IsString() @MinLength(1) name!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  countries!: string[];

  @ApiProperty() @IsNumber() @Min(0) standardFee!: number;
  @ApiProperty({ default: 0 }) @IsNumber() @Min(0) expressFee!: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeDeliveryThreshold?: number;

  @ApiProperty() @IsInt() @Min(0) standardDaysMin!: number;
  @ApiProperty() @IsInt() @Min(0) standardDaysMax!: number;
  @ApiProperty() @IsInt() @Min(0) expressDaysMin!: number;
  @ApiProperty() @IsInt() @Min(0) expressDaysMax!: number;

  @ApiProperty({ default: false }) @IsBoolean() expressAvailable!: boolean;
  @ApiProperty({ default: true }) @IsBoolean() active!: boolean;
}
