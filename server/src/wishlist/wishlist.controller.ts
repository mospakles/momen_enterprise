import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { CustomerJwtAuthGuard } from '../common/guards/customer-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedCustomer } from '../auth/customer-auth/customer-jwt.strategy';

@ApiTags('wishlist')
@ApiBearerAuth()
@UseGuards(CustomerJwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  findMine(@CurrentUser() user: AuthenticatedCustomer) {
    return this.wishlistService.findMine(user.id);
  }

  @Post(':productId')
  add(
    @CurrentUser() user: AuthenticatedCustomer,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.add(user.id, productId);
  }

  @Delete(':productId')
  remove(
    @CurrentUser() user: AuthenticatedCustomer,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.remove(user.id, productId);
  }
}
