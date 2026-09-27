import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentWebhooksController } from './webhooks/payment-webhooks.controller';
import { PaymentsCoreModule } from './payments-core.module';
import { PaymentProviderConfigModule } from './payment-provider-config/payment-provider-config.module';
import { RefundsModule } from './refunds/refunds.module';

@Module({
  imports: [PaymentsCoreModule, PaymentProviderConfigModule, RefundsModule],
  controllers: [PaymentsController, PaymentWebhooksController],
  exports: [PaymentsCoreModule, PaymentProviderConfigModule, RefundsModule],
})
export class PaymentsModule {}
