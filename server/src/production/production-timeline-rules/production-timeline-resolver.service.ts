import { Injectable } from '@nestjs/common';
import { Garment, ProductionSpeed, TimelineRuleScope } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface TimelineResolveItem {
  productSlug: string;
  collectionSlugs: string[];
  garment: Garment;
  /** The product's own stored days — used when no rule matches at any scope. */
  fallback: {
    standardDaysMin: number;
    standardDaysMax: number;
    expressDaysMin: number;
    expressDaysMax: number;
  };
}

interface DayRange {
  min: number;
  max: number;
}

/**
 * Resolves "how many days to produce this" from `ProductionTimelineRule`
 * data instead of hardcoding it — precedence is product > collection >
 * garment > country > global, most-specific match wins per line item. An
 * order with several items uses the slowest item's range (max of mins, max
 * of maxes), since the whole order ships together.
 */
@Injectable()
export class ProductionTimelineResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForOrder(
    items: TimelineResolveItem[],
    speed: ProductionSpeed,
    country: string,
  ): Promise<DayRange> {
    const rules = await this.prisma.productionTimelineRule.findMany();

    const ranges = items.map((item) =>
      this.resolveForItem(item, speed, country, rules),
    );
    return {
      min: Math.max(...ranges.map((r) => r.min)),
      max: Math.max(...ranges.map((r) => r.max)),
    };
  }

  private resolveForItem(
    item: TimelineResolveItem,
    speed: ProductionSpeed,
    country: string,
    rules: {
      scope: TimelineRuleScope;
      scopeRef: string | null;
      standardDaysMin: number;
      standardDaysMax: number;
      expressDaysMin: number;
      expressDaysMax: number;
    }[],
  ): DayRange {
    const matched =
      rules.find(
        (r) =>
          r.scope === TimelineRuleScope.product &&
          r.scopeRef === item.productSlug,
      ) ??
      rules.find(
        (r) =>
          r.scope === TimelineRuleScope.collection &&
          r.scopeRef !== null &&
          item.collectionSlugs.includes(r.scopeRef),
      ) ??
      rules.find(
        (r) =>
          r.scope === TimelineRuleScope.garment && r.scopeRef === item.garment,
      ) ??
      rules.find(
        (r) => r.scope === TimelineRuleScope.country && r.scopeRef === country,
      ) ??
      rules.find((r) => r.scope === TimelineRuleScope.global);

    const source = matched ?? {
      standardDaysMin: item.fallback.standardDaysMin,
      standardDaysMax: item.fallback.standardDaysMax,
      expressDaysMin: item.fallback.expressDaysMin,
      expressDaysMax: item.fallback.expressDaysMax,
    };

    return speed === ProductionSpeed.express
      ? { min: source.expressDaysMin, max: source.expressDaysMax }
      : { min: source.standardDaysMin, max: source.standardDaysMax };
  }
}
