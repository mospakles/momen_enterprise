import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { AdminJwtAuthGuard } from '../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@ApiTags('admin-wishlist')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/wishlist')
export class AdminWishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  @Permissions('customers', 'view')
  aggregate() {
    return this.wishlist.aggregate();
  }
}
