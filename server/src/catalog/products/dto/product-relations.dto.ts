import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class ColorVariantDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty()
  @IsString()
  hex!: string;

  @ApiProperty({ default: 0 })
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class SizeEntryDto {
  @ApiProperty({
    required: false,
    description:
      'FK to the global SizeOption library, when this size matches a canonical label',
  })
  @IsOptional()
  @IsString()
  sizeOptionId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiProperty({ default: 0 })
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ProductCustomizationEntryDto {
  @ApiProperty()
  @IsString()
  groupId!: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  required!: boolean;
}

export class SeoDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() title?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() slug?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() ogImage?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  socialTitle?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  socialDescription?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  noIndex?: boolean;
}
