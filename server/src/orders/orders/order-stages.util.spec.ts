import { OrderStatus, SizingMode } from '@prisma/client';
import { isCustomOrderRequest, stagesForItems } from './order-stages.util';
import {
  isStockTracked,
  measurementValuesError,
  missingMeasurementsError,
  requiresMeasurements,
} from './order-items.util';

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

  describe('measurement stages follow what the customer chose, not the product', () => {
    const stagesFor = (item: {
      fit?: 'standard' | 'measure';
      size: string;
      sizingMode: SizingMode;
    }) =>
      stagesForItems([
        { isMadeToMeasure: requiresMeasurements(item), hasCustomOrder: false },
      ]);

    it('a standard size of a "both" product gets no measurement stages', () => {
      const stages = stagesFor({
        fit: 'standard',
        size: 'L',
        sizingMode: SizingMode.both,
      });
      expect(stages).not.toContain(OrderStatus.awaiting_measurements);
      expect(stages).not.toContain(OrderStatus.measurements_confirmed);
    });

    it('a "both" product with no fit and a standard size gets no measurement stages', () => {
      expect(
        stagesFor({ size: 'M', sizingMode: SizingMode.both }),
      ).not.toContain(OrderStatus.awaiting_measurements);
    });

    it('fit "measure" adds the measurement stages', () => {
      const stages = stagesFor({
        fit: 'measure',
        size: 'L',
        sizingMode: SizingMode.both,
      });
      expect(stages).toContain(OrderStatus.awaiting_measurements);
      expect(stages).toContain(OrderStatus.measurements_confirmed);
    });

    it('the "Made-to-Measure" size adds the measurement stages', () => {
      expect(
        stagesFor({ size: 'Made-to-Measure', sizingMode: SizingMode.both }),
      ).toContain(OrderStatus.awaiting_measurements);
    });

    it('a made-to-measure-only product needs measurements when fit is absent, not when standard was chosen', () => {
      expect(
        requiresMeasurements({
          size: 'M',
          sizingMode: SizingMode.made_to_measure,
        }),
      ).toBe(true);
      expect(
        requiresMeasurements({
          fit: 'standard',
          size: 'M',
          sizingMode: SizingMode.made_to_measure,
        }),
      ).toBe(false);
    });
  });

  describe('order-items.util', () => {
    it('only made-to-measure-only products skip stock tracking', () => {
      expect(isStockTracked({ sizingMode: SizingMode.made_to_measure })).toBe(
        false,
      );
      expect(isStockTracked({ sizingMode: SizingMode.both })).toBe(true);
      expect(isStockTracked({ sizingMode: SizingMode.standard })).toBe(true);
      expect(isStockTracked({ sizingMode: SizingMode.one_size })).toBe(true);
    });

    it('accepts a flat object of finite positive numbers and rejects anything else', () => {
      expect(measurementValuesError(undefined)).toBeNull();
      expect(measurementValuesError({ chest: 102, waist: 88.5 })).toBeNull();
      expect(measurementValuesError({ chest: 0 })).not.toBeNull();
      expect(measurementValuesError({ chest: -3 })).not.toBeNull();
      expect(measurementValuesError({ chest: '102' })).not.toBeNull();
      expect(measurementValuesError({ chest: Infinity })).not.toBeNull();
      expect(measurementValuesError({ chest: { cm: 1 } })).not.toBeNull();
      expect(measurementValuesError([102])).not.toBeNull();
    });

    it('requires a profile or non-empty manual values when measurements are needed', () => {
      expect(
        missingMeasurementsError({ mode: 'profile', profileId: 'p1' }, 'Agbada'),
      ).toBeNull();
      expect(
        missingMeasurementsError(
          { mode: 'manual', values: { chest: 100 } },
          'Agbada',
        ),
      ).toBeNull();
      expect(
        missingMeasurementsError({ mode: 'pending' }, 'Agbada'),
      ).toMatch(/Agbada is cut to measure/);
      expect(
        missingMeasurementsError({ mode: 'manual', values: {} }, 'Agbada'),
      ).not.toBeNull();
      expect(
        missingMeasurementsError({ mode: 'profile' }, 'Agbada'),
      ).not.toBeNull();
    });
  });
});
