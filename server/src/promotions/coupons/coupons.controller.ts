import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { OptionalCustomerJwtAuthGuard } from '../../common/guards/customer-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedCustomer } from '../../auth/customer-auth/customer-jwt.strategy';

@ApiTags('storefront-coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @UseGuards(OptionalCustomerJwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  validate(
    @CurrentUser() user: AuthenticatedCustomer | null,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.couponsService.previewValidate(dto, user?.id);
  }
}
