import { Module } from '@nestjs/common';
import { FaqsController } from './faqs.controller';
import { AdminFaqsController } from './admin-faqs.controller';
import { FaqsService } from './faqs.service';

@Module({
  controllers: [FaqsController, AdminFaqsController],
  providers: [FaqsService],
  exports: [FaqsService],
})
export class FaqsModule {}
