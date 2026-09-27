import { ProductionSpeed, TimelineRuleScope } from '@prisma/client';
import { ProductionTimelineResolverService } from './production-timeline-resolver.service';

type Rule = {
  scope: TimelineRuleScope;
  scopeRef: string | null;
  standardDaysMin: number;
  standardDaysMax: number;
  expressDaysMin: number;
  expressDaysMax: number;
};

function fakePrisma(rules: Rule[]) {
  return {
    productionTimelineRule: { findMany: jest.fn().mockResolvedValue(rules) },
  };
}

const FALLBACK = {
  standardDaysMin: 1,
  standardDaysMax: 2,
  expressDaysMin: 1,
  expressDaysMax: 1,
};

describe('ProductionTimelineResolverService', () => {
  it("falls back to the product's own stored days when no rule exists at all", async () => {
    const service = new ProductionTimelineResolverService(
      fakePrisma([]) as never,
    );

    const result = await service.resolveForOrder(
      [
        {
          productSlug: 'kaftan-1',
          collectionSlugs: [],
          garment: 'top',
          fallback: FALLBACK,
        },
      ],
      ProductionSpeed.standard,
      'Nigeria',
    );

    expect(result).toEqual({
      min: FALLBACK.standardDaysMin,
      max: FALLBACK.standardDaysMax,
    });
  });

  it('prefers a product-scoped rule over collection/garment/country/global rules that also match', async () => {
    const rules: Rule[] = [
      {
        scope: TimelineRuleScope.global,
        scopeRef: null,
        standardDaysMin: 30,
        standardDaysMax: 30,
        expressDaysMin: 30,
        expressDaysMax: 30,
      },
      {
        scope: TimelineRuleScope.country,
        scopeRef: 'Nigeria',
        standardDaysMin: 20,
        standardDaysMax: 20,
        expressDaysMin: 20,
        expressDaysMax: 20,
      },
      {
        scope: TimelineRuleScope.garment,
        scopeRef: 'top',
        standardDaysMin: 10,
        standardDaysMax: 10,
        expressDaysMin: 10,
        expressDaysMax: 10,
      },
      {
        scope: TimelineRuleScope.collection,
        scopeRef: 'heritage',
        standardDaysMin: 7,
        standardDaysMax: 7,
        expressDaysMin: 7,
        expressDaysMax: 7,
      },
      {
        scope: TimelineRuleScope.product,
        scopeRef: 'kaftan-1',
        standardDaysMin: 5,
        standardDaysMax: 5,
        expressDaysMin: 3,
        expressDaysMax: 3,
      },
    ];
    const service = new ProductionTimelineResolverService(
      fakePrisma(rules) as never,
    );

    const result = await service.resolveForOrder(
      [
        {
          productSlug: 'kaftan-1',
          collectionSlugs: ['heritage'],
          garment: 'top',
          fallback: FALLBACK,
        },
      ],
      ProductionSpeed.standard,
      'Nigeria',
    );

    expect(result).toEqual({ min: 5, max: 5 });
  });

  it("falls through to collection, then garment, then country, then global when more specific scopes don't match", async () => {
    const rules: Rule[] = [
      {
        scope: TimelineRuleScope.global,
        scopeRef: null,
        standardDaysMin: 30,
        standardDaysMax: 30,
        expressDaysMin: 30,
        expressDaysMax: 30,
      },
      {
        scope: TimelineRuleScope.garment,
        scopeRef: 'top',
        standardDaysMin: 10,
        standardDaysMax: 10,
        expressDaysMin: 10,
        expressDaysMax: 10,
      },
    ];
    const service = new ProductionTimelineResolverService(
      fakePrisma(rules) as never,
    );

    // No product or collection rule matches this item — should land on the garment rule.
    const result = await service.resolveForOrder(
      [
        {
          productSlug: 'unrelated-product',
          collectionSlugs: ['unrelated-collection'],
          garment: 'top',
          fallback: FALLBACK,
        },
      ],
      ProductionSpeed.standard,
      'Nigeria',
    );

    expect(result).toEqual({ min: 10, max: 10 });
  });

  it('uses the slowest item across a multi-item order, not the first or the average', async () => {
    const rules: Rule[] = [
      {
        scope: TimelineRuleScope.product,
        scopeRef: 'fast-item',
        standardDaysMin: 2,
        standardDaysMax: 3,
        expressDaysMin: 1,
        expressDaysMax: 1,
      },
      {
        scope: TimelineRuleScope.product,
        scopeRef: 'slow-item',
        standardDaysMin: 10,
        standardDaysMax: 14,
        expressDaysMin: 5,
        expressDaysMax: 6,
      },
    ];
    const service = new ProductionTimelineResolverService(
      fakePrisma(rules) as never,
    );

    const result = await service.resolveForOrder(
      [
        {
          productSlug: 'fast-item',
          collectionSlugs: [],
          garment: 'top',
          fallback: FALLBACK,
        },
        {
          productSlug: 'slow-item',
          collectionSlugs: [],
          garment: 'top',
          fallback: FALLBACK,
        },
      ],
      ProductionSpeed.standard,
      'Nigeria',
    );

    expect(result).toEqual({ min: 10, max: 14 });
  });

  it('reads the express day range when productionSpeed is express', async () => {
    const rules: Rule[] = [
      {
        scope: TimelineRuleScope.product,
        scopeRef: 'kaftan-1',
        standardDaysMin: 10,
        standardDaysMax: 14,
        expressDaysMin: 4,
        expressDaysMax: 6,
      },
    ];
    const service = new ProductionTimelineResolverService(
      fakePrisma(rules) as never,
    );

    const result = await service.resolveForOrder(
      [
        {
          productSlug: 'kaftan-1',
          collectionSlugs: [],
          garment: 'top',
          fallback: FALLBACK,
        },
      ],
      ProductionSpeed.express,
      'Nigeria',
    );

    expect(result).toEqual({ min: 4, max: 6 });
  });
});
