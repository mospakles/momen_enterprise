import { Module } from '@nestjs/common';
import { ProductionTimelineRulesController } from './production-timeline-rules.controller';
import { ProductionTimelineRulesService } from './production-timeline-rules.service';
import { ProductionTimelineResolverService } from './production-timeline-resolver.service';

@Module({
  controllers: [ProductionTimelineRulesController],
  providers: [
    ProductionTimelineRulesService,
    ProductionTimelineResolverService,
  ],
  exports: [ProductionTimelineRulesService, ProductionTimelineResolverService],
})
export class ProductionTimelineRulesModule {}
