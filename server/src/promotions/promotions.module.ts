import { Module } from '@nestjs/common';
import { CouponsModule } from './coupons/coupons.module';
import { GiftCardsModule } from './gift-cards/gift-cards.module';

@Module({
  imports: [CouponsModule, GiftCardsModule],
  exports: [CouponsModule, GiftCardsModule],
})
export class PromotionsModule {}
