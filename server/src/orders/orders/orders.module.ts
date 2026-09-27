import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersService } from './orders.service';
import { ProductsModule } from '../../catalog/products/products.module';
import { ProductionStaffModule } from '../../production/production-staff/production-staff.module';
import { ProductionTimelineRulesModule } from '../../production/production-timeline-rules/production-timeline-rules.module';
import { DeliveryZonesModule } from '../../delivery/delivery-zones/delivery-zones.module';
import { CouponsModule } from '../../promotions/coupons/coupons.module';
import { GiftCardsModule } from '../../promotions/gift-cards/gift-cards.module';

@Module({
  imports: [
    ProductsModule,
    ProductionStaffModule,
    ProductionTimelineRulesModule,
    DeliveryZonesModule,
    CouponsModule,
    GiftCardsModule,
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
