import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentWebhooksController } from './webhooks/payment-webhooks.controller';
import { PaymentsCoreModule } from './payments-core.module';
import { PaymentProviderConfigModule } from './payment-provider-config/payment-provider-config.module';
import { RefundsModule } from './refunds/refunds.module';
import { AdminPaymentsController } from './admin-payments.controller';

@Module({
  imports: [PaymentsCoreModule, PaymentProviderConfigModule, RefundsModule],
  controllers: [PaymentsController, PaymentWebhooksController, AdminPaymentsController],
  exports: [PaymentsCoreModule, PaymentProviderConfigModule, RefundsModule],
})
export class PaymentsModule {}
