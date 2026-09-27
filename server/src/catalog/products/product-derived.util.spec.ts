import { deriveStockStatus } from './product-derived.util';

describe('deriveStockStatus', () => {
  it('is always made-to-order for made-to-measure sizing, regardless of quantity counters', () => {
    expect(
      deriveStockStatus({
        sizingMode: 'made_to_measure',
        stockQuantity: 0,
        reservedQuantity: 0,
        lowStockThreshold: 5,
      }),
    ).toBe('made-to-order');
  });

  it('is out-of-stock once reservations consume all available units', () => {
    expect(
      deriveStockStatus({
        sizingMode: 'standard',
        stockQuantity: 5,
        reservedQuantity: 5,
        lowStockThreshold: 2,
      }),
    ).toBe('out-of-stock');
  });

  it('is low-stock when available units are at or below the threshold but still positive', () => {
    expect(
      deriveStockStatus({
        sizingMode: 'standard',
        stockQuantity: 10,
        reservedQuantity: 8,
        lowStockThreshold: 2,
      }),
    ).toBe('low-stock');
  });

  it('is in-stock when available units exceed the threshold', () => {
    expect(
      deriveStockStatus({
        sizingMode: 'standard',
        stockQuantity: 10,
        reservedQuantity: 2,
        lowStockThreshold: 2,
      }),
    ).toBe('in-stock');
  });
});
