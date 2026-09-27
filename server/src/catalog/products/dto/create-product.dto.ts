import { ApiProperty } from '@nestjs/swagger';
import {
  Gender,
  Garment,
  ProductionType,
  ProductType,
  PublishStatus,
  SizingMode,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ColorVariantDto,
  ProductCustomizationEntryDto,
  SeoDto,
  SizeEntryDto,
} from './product-relations.dto';

export class CreateProductDto {
  @ApiProperty() @IsString() @MinLength(1) slug!: string;
  @ApiProperty() @IsString() @MinLength(1) name!: string;
  @ApiProperty() @IsString() @MinLength(1) sku!: string;
  @ApiProperty() @IsString() categoryId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  collectionIds!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  tagNames!: string[];

  @ApiProperty() @IsNumber() @Min(0) price!: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  images!: string[];
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hoverImage?: string;
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  @ApiProperty({ type: [ColorVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColorVariantDto)
  colorVariants!: ColorVariantDto[];

  @ApiProperty({ type: [SizeEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeEntryDto)
  sizes!: SizeEntryDto[];

  @ApiProperty({ enum: ProductionType })
  @IsEnum(ProductionType)
  productionType!: ProductionType;
  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  productType!: ProductType;
  @ApiProperty({ enum: Gender }) @IsEnum(Gender) gender!: Gender;
  @ApiProperty({ enum: SizingMode })
  @IsEnum(SizingMode)
  sizingMode!: SizingMode;
  @ApiProperty({ enum: Garment }) @IsEnum(Garment) garment!: Garment;

  @ApiProperty({ type: [String], description: 'Fabric library ids' })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  fabricIds!: string[];

  @ApiProperty() @IsString() description!: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shortDescription?: string;
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  details!: string[];
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  careInstructions!: string[];

  @ApiProperty() @IsInt() @Min(0) productionDaysStandardMin!: number;
  @ApiProperty() @IsInt() @Min(0) productionDaysStandardMax!: number;
  @ApiProperty() @IsInt() @Min(0) productionDaysExpressMin!: number;
  @ApiProperty() @IsInt() @Min(0) productionDaysExpressMax!: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isNew?: boolean;
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isSignature?: boolean;

  @ApiProperty() @IsInt() @Min(0) stockQuantity!: number;
  @ApiProperty() @IsInt() @Min(0) lowStockThreshold!: number;

  @ApiProperty({ enum: PublishStatus, default: PublishStatus.draft })
  @IsOptional()
  @IsEnum(PublishStatus)
  publishStatus?: PublishStatus;

  @ApiProperty({
    required: false,
    description: 'ISO date — only meaningful when publishStatus is "scheduled"',
  })
  @IsOptional()
  @IsString()
  publishAt?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  expressEligible?: boolean;
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  customizable?: boolean;
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  referenceImagesAllowed?: boolean;
  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  specialInstructionsAllowed?: boolean;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  crossSellCategorySlugs?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sizeChart?: string;

  @ApiProperty({ type: SeoDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  seo?: SeoDto;

  @ApiProperty({ type: [ProductCustomizationEntryDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductCustomizationEntryDto)
  customizations?: ProductCustomizationEntryDto[];

  @ApiProperty({
    type: [String],
    required: false,
    description: 'MeasurementFieldDef keys enabled for this product',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  measurementFieldKeys?: string[];
}
