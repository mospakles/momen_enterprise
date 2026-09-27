import { Module } from '@nestjs/common';
import { ProductionStaffModule } from './production-staff/production-staff.module';
import { ProductionTimelineRulesModule } from './production-timeline-rules/production-timeline-rules.module';
import { ProductionQueueModule } from './production-queue/production-queue.module';

@Module({
  imports: [
    ProductionStaffModule,
    ProductionTimelineRulesModule,
    ProductionQueueModule,
  ],
  exports: [
    ProductionStaffModule,
    ProductionTimelineRulesModule,
    ProductionQueueModule,
  ],
})
export class ProductionModule {}
