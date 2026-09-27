import { Module } from '@nestjs/common';
import { ProductionQueueController } from './production-queue.controller';
import { ProductionQueueService } from './production-queue.service';

@Module({
  controllers: [ProductionQueueController],
  providers: [ProductionQueueService],
  exports: [ProductionQueueService],
})
export class ProductionQueueModule {}
