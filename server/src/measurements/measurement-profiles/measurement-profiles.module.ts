import { Module } from '@nestjs/common';
import { MeasurementProfilesController } from './measurement-profiles.controller';
import {
  AdminAllMeasurementProfilesController,
  AdminMeasurementProfilesController,
} from './admin-measurement-profiles.controller';
import { MeasurementProfilesService } from './measurement-profiles.service';

@Module({
  controllers: [
    MeasurementProfilesController,
    AdminAllMeasurementProfilesController,
    AdminMeasurementProfilesController,
  ],
  providers: [MeasurementProfilesService],
  exports: [MeasurementProfilesService],
})
export class MeasurementProfilesModule {}
