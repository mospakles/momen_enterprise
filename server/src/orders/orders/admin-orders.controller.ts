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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-status.dto';
import { AddOrderNoteDto } from './dto/add-note.dto';
import { UpdateOrderProductionDto } from './dto/update-production.dto';
import { UpdateCustomizationStatusDto } from './dto/update-customization-status.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedAdminUser } from '../../auth/admin-auth/admin-jwt.strategy';

@ApiTags('admin-orders')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Permissions('orders', 'view')
  findAll(
    @Query('status') status?: OrderStatus,
    @Query('customerId') customerId?: string,
    @Query('channel') channel?: string,
  ) {
    return this.ordersService.findAllAdmin({ status, customerId, channel });
  }

  @Get(':id')
  @Permissions('orders', 'view')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOneAdmin(id);
  }

  @Patch(':id/status')
  @Permissions('orders', 'edit')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.ordersService.updateStatus(id, dto, {
      id: user.id,
      name: user.name,
    });
  }

  @Post(':id/notes')
  @Permissions('orders', 'edit')
  addNote(
    @Param('id') id: string,
    @Body() dto: AddOrderNoteDto,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.ordersService.addNote(id, dto, {
      id: user.id,
      name: user.name,
    });
  }

  @Patch(':id/production')
  @Permissions('production', 'edit')
  updateProduction(
    @Param('id') id: string,
    @Body() dto: UpdateOrderProductionDto,
  ) {
    return this.ordersService.updateProduction(id, dto);
  }

  @Patch(':id/customization-status')
  @Permissions('orders', 'approve')
  updateCustomizationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCustomizationStatusDto,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.ordersService.updateCustomizationStatus(id, dto, {
      id: user.id,
      name: user.name,
    });
  }

  @Patch(':id/payment-status')
  @Permissions('payments', 'edit')
  setPaymentStatus(
    @Param('id') id: string,
    @Body('status')
    status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded',
  ) {
    return this.ordersService.setPaymentStatus(id, status);
  }

  @Post(':id/cancel')
  @Permissions('orders', 'edit')
  cancel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.ordersService.cancel(id, reason);
  }

  @Post(':id/duplicate')
  @Permissions('orders', 'create')
  duplicate(@Param('id') id: string) {
    return this.ordersService.duplicate(id);
  }
}
