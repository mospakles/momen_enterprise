import { ApiProperty } from '@nestjs/swagger';
import { ProductionStaffStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertProductionStaffDto {
  @ApiProperty() @IsString() @MinLength(1) name!: string;
  @ApiProperty({
    description: 'Free text, e.g. "Cutter", "Tailor", "Quality Control"',
  })
  @IsString()
  @MinLength(1)
  role!: string;
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsInt() @Min(0) capacityPerWeek!: number;
  @ApiProperty({
    enum: ProductionStaffStatus,
    default: ProductionStaffStatus.active,
  })
  @IsEnum(ProductionStaffStatus)
  status!: ProductionStaffStatus;
}
