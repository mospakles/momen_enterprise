import { Module } from '@nestjs/common';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { AdminWishlistController } from './admin-wishlist.controller';

@Module({
  controllers: [WishlistController, AdminWishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
