import { Module } from '@nestjs/common';
import { PaymentProviderConfigController } from './payment-provider-config.controller';
import { PaymentProviderConfigService } from './payment-provider-config.service';

@Module({
  controllers: [PaymentProviderConfigController],
  providers: [PaymentProviderConfigService],
  exports: [PaymentProviderConfigService],
})
export class PaymentProviderConfigModule {}
