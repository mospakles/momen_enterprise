import { Module } from '@nestjs/common';
import { DeliveryZonesModule } from './delivery-zones/delivery-zones.module';

@Module({
  imports: [DeliveryZonesModule],
  exports: [DeliveryZonesModule],
})
export class DeliveryModule {}
