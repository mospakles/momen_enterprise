import { Module } from '@nestjs/common';
import {
  AdminMeasurementFieldDefsController,
  MeasurementFieldDefsController,
} from './measurement-field-defs.controller';
import { MeasurementFieldDefsService } from './measurement-field-defs.service';

@Module({
  controllers: [
    MeasurementFieldDefsController,
    AdminMeasurementFieldDefsController,
  ],
  providers: [MeasurementFieldDefsService],
  exports: [MeasurementFieldDefsService],
})
export class MeasurementFieldDefsModule {}
