import { OrderStatus } from '@prisma/client';
import { isCustomOrderRequest, stagesForItems } from './order-stages.util';

describe('order-stages.util', () => {
  it('excludes customization_review and measurement stages for a plain ready-to-wear order', () => {
    const stages = stagesForItems([
      { isMadeToMeasure: false, hasCustomOrder: false },
    ]);

    expect(stages).not.toContain(OrderStatus.customization_review);
    expect(stages).not.toContain(OrderStatus.awaiting_measurements);
    expect(stages).not.toContain(OrderStatus.measurements_confirmed);
    expect(stages[0]).toBe(OrderStatus.order_placed);
    expect(stages[stages.length - 1]).toBe(OrderStatus.delivered);
  });

  it('includes measurement stages for a made-to-measure order', () => {
    const stages = stagesForItems([
      { isMadeToMeasure: true, hasCustomOrder: false },
    ]);

    expect(stages).toContain(OrderStatus.awaiting_measurements);
    expect(stages).toContain(OrderStatus.measurements_confirmed);
    expect(stages).not.toContain(OrderStatus.customization_review);
  });

  it('includes customization_review whenever any item carries a custom order, regardless of the rest of the cart', () => {
    const stages = stagesForItems([
      { isMadeToMeasure: false, hasCustomOrder: false },
      { isMadeToMeasure: false, hasCustomOrder: true },
    ]);

    expect(stages).toContain(OrderStatus.customization_review);
  });

  it('flags an order as custom the moment any single item carries reference images or instructions', () => {
    expect(
      isCustomOrderRequest([{ isMadeToMeasure: false, hasCustomOrder: true }]),
    ).toBe(true);
    expect(
      isCustomOrderRequest([{ isMadeToMeasure: false, hasCustomOrder: false }]),
    ).toBe(false);
  });
});
