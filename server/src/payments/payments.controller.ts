import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { OptionalCustomerJwtAuthGuard } from '../common/guards/customer-jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedCustomer } from '../auth/customer-auth/customer-jwt.strategy';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initialize')
  @UseGuards(OptionalCustomerJwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  initialize(
    @CurrentUser() user: AuthenticatedCustomer | null,
    @Body() dto: InitializePaymentDto,
  ) {
    return this.paymentsService.initializePayment(
      dto.orderId,
      { customerId: user?.id, customerEmail: dto.customerEmail },
      dto.provider,
    );
  }

  @Get('providers')
  @Public()
  async providers() {
    return { providers: await this.paymentsService.availableProviders() };
  }

  @Get('verify/:reference')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  verify(@Param('reference') reference: string) {
    return this.paymentsService.verifyAndSync(reference);
  }
}
