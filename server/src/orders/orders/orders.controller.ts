import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OptionalCustomerJwtAuthGuard,
  CustomerJwtAuthGuard,
} from '../../common/guards/customer-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedCustomer } from '../../auth/customer-auth/customer-jwt.strategy';

@ApiTags('storefront-orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(OptionalCustomerJwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @CurrentUser() user: AuthenticatedCustomer | null,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(dto, {
      customerId: user?.id,
      customerEmail: dto.customerEmail,
    });
  }

  @Get('mine')
  @UseGuards(CustomerJwtAuthGuard)
  findMine(@CurrentUser() user: AuthenticatedCustomer) {
    return this.ordersService.findMineForCustomer(user.id);
  }

  @Get('mine/:id')
  @UseGuards(CustomerJwtAuthGuard)
  findMineOne(
    @CurrentUser() user: AuthenticatedCustomer,
    @Param('id') id: string,
  ) {
    return this.ordersService.findOwned(id, user.id);
  }

  @Patch('mine/:id/customization-confirm')
  @UseGuards(CustomerJwtAuthGuard)
  confirmCustomization(
    @CurrentUser() user: AuthenticatedCustomer,
    @Param('id') id: string,
  ) {
    return this.ordersService.confirmCustomization(id, user.id);
  }

  @Get('track')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  track(@Query('id') id: string, @Query('email') email: string) {
    return this.ordersService.trackGuestOrder(id, email);
  }
}
