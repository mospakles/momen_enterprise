import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { MeasurementsModule } from './measurements/measurements.module';
import { OrdersModule } from './orders/orders/orders.module';
import { ProductionModule } from './production/production.module';
import { PaymentsModule } from './payments/payments.module';
import { DeliveryModule } from './delivery/delivery.module';
import { PromotionsModule } from './promotions/promotions.module';
import { CustomersModule } from './customers/customers.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { CmsModule } from './cms/cms.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlatformModule } from './platform/platform.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuditLogModule,
    AuthModule,
    CatalogModule,
    MeasurementsModule,
    OrdersModule,
    ProductionModule,
    PaymentsModule,
    DeliveryModule,
    PromotionsModule,
    CustomersModule,
    ReviewsModule,
    WishlistModule,
    CmsModule,
    NotificationsModule,
    PlatformModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
