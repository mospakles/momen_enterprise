import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from '../payments.service';
import { Public } from '../../common/decorators/public.decorator';

/** Provider webhooks — never behind JWT (the provider isn't a logged-in
 * user), authenticated instead via a per-provider HMAC signature over the
 * raw request body. See main.ts's `rawBody: true` for how `request.rawBody`
 * gets populated ahead of JSON parsing. */
@ApiExcludeController()
@Public()
@Controller('payments/webhooks')
export class PaymentWebhooksController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('paystack')
  @HttpCode(HttpStatus.OK)
  async paystack(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string | undefined,
  ) {
    if (!request.rawBody) return { handled: false };
    return this.paymentsService.handleWebhook(
      PaymentProvider.paystack,
      request.rawBody,
      signature,
    );
  }

  @Post('flutterwave')
  @HttpCode(HttpStatus.OK)
  async flutterwave(
    @Req() request: RawBodyRequest<Request>,
    @Headers('verif-hash') signature: string | undefined,
  ) {
    if (!request.rawBody) return { handled: false };
    return this.paymentsService.handleWebhook(
      PaymentProvider.flutterwave,
      request.rawBody,
      signature,
    );
  }
}
