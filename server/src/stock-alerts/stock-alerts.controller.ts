import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { StockAlertsService } from './stock-alerts.service';
import { CreateStockAlertDto } from './dto/create-stock-alert.dto';
import { Public } from '../common/decorators/public.decorator';
import { OptionalCustomerJwtAuthGuard } from '../common/guards/customer-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminJwtAuthGuard } from '../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedCustomer } from '../auth/customer-auth/customer-jwt.strategy';

@ApiTags('stock-alerts')
@Public()
@Controller('stock-alerts')
export class StockAlertsController {
  constructor(private readonly alerts: StockAlertsService) {}

  @Post()
  @UseGuards(OptionalCustomerJwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@CurrentUser() user: AuthenticatedCustomer | null, @Body() dto: CreateStockAlertDto) {
    return this.alerts.create(dto, user?.id);
  }
}

@ApiTags('admin-stock-alerts')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/stock-alerts')
export class AdminStockAlertsController {
  constructor(private readonly alerts: StockAlertsService) {}

  @Get()
  @Permissions('products', 'view')
  findAll() {
    return this.alerts.findAllAdmin();
  }

  @Post('check/:productId')
  @Permissions('products', 'edit')
  check(@Param('productId') productId: string) {
    return this.alerts.check(productId);
  }
}
