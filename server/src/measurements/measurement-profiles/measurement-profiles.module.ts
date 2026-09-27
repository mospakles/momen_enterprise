import { Module } from '@nestjs/common';
import { MeasurementProfilesController } from './measurement-profiles.controller';
import { AdminMeasurementProfilesController } from './admin-measurement-profiles.controller';
import { MeasurementProfilesService } from './measurement-profiles.service';

@Module({
  controllers: [
    MeasurementProfilesController,
    AdminMeasurementProfilesController,
  ],
  providers: [MeasurementProfilesService],
  exports: [MeasurementProfilesService],
})
export class MeasurementProfilesModule {}
