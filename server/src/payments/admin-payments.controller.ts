import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { AdminJwtAuthGuard } from '../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@ApiTags('admin-payments')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/payment-transactions')
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @Permissions('payments', 'view')
  findAll() {
    return this.payments.findTransactions();
  }
}
