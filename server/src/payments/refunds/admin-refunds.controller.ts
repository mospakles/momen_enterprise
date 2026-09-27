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
import { RefundStatus } from '@prisma/client';
import { RefundsService } from './refunds.service';
import { RequestRefundDto } from './dto/request-refund.dto';
import { RejectRefundDto } from './dto/reject-refund.dto';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedAdminUser } from '../../auth/admin-auth/admin-jwt.strategy';

@ApiTags('admin-refunds')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, PermissionsGuard)
@Controller('admin/refunds')
export class AdminRefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Get()
  @Permissions('refunds', 'view')
  findAll(@Query('status') status?: RefundStatus) {
    return this.refundsService.findAll(status);
  }

  // Admin-initiated — e.g. a phone order or a goodwill refund raised on the
  // customer's behalf, not requested through the storefront.
  @Post('orders/:orderId')
  @Permissions('refunds', 'create')
  create(
    @Param('orderId') orderId: string,
    @Body() dto: RequestRefundDto,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.refundsService.request(orderId, dto, {
      id: user.id,
      name: user.name,
    });
  }

  @Patch(':id/approve')
  @Permissions('refunds', 'approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.refundsService.approve(id, { id: user.id, name: user.name });
  }

  @Patch(':id/reject')
  @Permissions('refunds', 'approve')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectRefundDto,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.refundsService.reject(id, dto.reason, {
      id: user.id,
      name: user.name,
    });
  }

  @Post(':id/process')
  @Permissions('refunds', 'refund')
  process(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedAdminUser,
  ) {
    return this.refundsService.process(id, { id: user.id, name: user.name });
  }
}
