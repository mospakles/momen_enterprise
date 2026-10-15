import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaystackProvider } from './providers/paystack/paystack.provider';
import { FlutterwaveProvider } from './providers/flutterwave/flutterwave.provider';
import { OrdersModule } from '../orders/orders/orders.module';

// Split out from PaymentsModule so RefundsModule (which needs PaymentsService
// for its provider-refund call) doesn't have to import the top-level
// PaymentsModule that in turn imports RefundsModule — that'd be a cycle.
// Re-exports OrdersModule so anything importing this also gets OrdersService
// without importing OrdersModule separately.
@Module({
  imports: [OrdersModule],
  providers: [PaymentsService, PaystackProvider, FlutterwaveProvider],
  exports: [OrdersModule, PaymentsService, PaystackProvider, FlutterwaveProvider],
})
export class PaymentsCoreModule {}
