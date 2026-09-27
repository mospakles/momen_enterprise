import { ApiProperty } from '@nestjs/swagger';
import { MeasurementUnit } from '@prisma/client';
import { IsEnum, IsObject, IsString, MinLength } from 'class-validator';

export class UpsertMeasurementProfileDto {
  @ApiProperty() @IsString() @MinLength(1) label!: string;
  @ApiProperty({ enum: MeasurementUnit })
  @IsEnum(MeasurementUnit)
  unit!: MeasurementUnit;

  @ApiProperty({
    description: 'Partial<Record<measurementFieldKey, number>>',
    example: { chest: 102, waist: 88 },
  })
  @IsObject()
  values!: Record<string, number>;
}
