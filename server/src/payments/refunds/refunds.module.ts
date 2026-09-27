import { Module } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { AdminRefundsController } from './admin-refunds.controller';
import { RefundsService } from './refunds.service';
import { PaymentsCoreModule } from '../payments-core.module';

@Module({
  imports: [PaymentsCoreModule],
  controllers: [RefundsController, AdminRefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
