import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RefundsService } from './refunds.service';
import { RequestRefundDto } from './dto/request-refund.dto';
import { CustomerJwtAuthGuard } from '../../common/guards/customer-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedCustomer } from '../../auth/customer-auth/customer-jwt.strategy';

/** Customer-initiated refund requests, scoped to the customer's own orders. */
@ApiTags('refunds')
@ApiBearerAuth()
@UseGuards(CustomerJwtAuthGuard)
@Controller('orders/mine/:orderId/refund-request')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  request(
    @Param('orderId') orderId: string,
    @Body() dto: RequestRefundDto,
    @CurrentUser() user: AuthenticatedCustomer,
  ) {
    return this.refundsService.request(
      orderId,
      dto,
      { id: user.id, name: user.name },
      user.id,
    );
  }
}
