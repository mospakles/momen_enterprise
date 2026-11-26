import { ApiProperty } from '@nestjs/swagger';
import { MeasurementUnit } from '@prisma/client';
import { IsObject, IsString, MinLength } from 'class-validator';
import {
  API_MEASUREMENT_UNITS,
  IsApiMeasurementUnit,
} from '../../../common/utils/measurement-unit.util';

export class UpsertMeasurementProfileDto {
  @ApiProperty() @IsString() @MinLength(1) label!: string;
  @ApiProperty({ enum: API_MEASUREMENT_UNITS })
  @IsApiMeasurementUnit()
  unit!: MeasurementUnit;

  @ApiProperty({
    description: 'Partial<Record<measurementFieldKey, number>>',
    example: { chest: 102, waist: 88 },
  })
  @IsObject()
  values!: Record<string, number>;
}
