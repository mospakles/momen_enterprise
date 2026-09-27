import { ApiProperty } from '@nestjs/swagger';
import { HomepageSectionType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertHomepageSectionDto {
  @ApiProperty({ enum: HomepageSectionType })
  @IsEnum(HomepageSectionType)
  type!: HomepageSectionType;
  @ApiProperty() @IsString() @MinLength(1) label!: string;
  @ApiProperty({ default: true }) @IsBoolean() visible!: boolean;
  @ApiProperty({ default: 0 }) @IsInt() @Min(0) sortOrder!: number;

  @ApiProperty({
    description:
      'Free-form string map interpreted per `type` by the frontend section renderer',
  })
  @IsObject()
  content!: Record<string, string>;
}
