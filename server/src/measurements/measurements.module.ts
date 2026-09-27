import { Module } from '@nestjs/common';
import { MeasurementFieldDefsModule } from './measurement-field-defs/measurement-field-defs.module';
import { MeasurementProfilesModule } from './measurement-profiles/measurement-profiles.module';

@Module({
  imports: [MeasurementFieldDefsModule, MeasurementProfilesModule],
  exports: [MeasurementFieldDefsModule, MeasurementProfilesModule],
})
export class MeasurementsModule {}
