import { SizingMode } from '@prisma/client';

export type OrderItemFit = 'standard' | 'measure';

/** The size label the storefront uses for a piece cut to the customer's own
 * measurements (rather than a standard size). */
export const MADE_TO_MEASURE_SIZE = 'Made-to-Measure';

/** Whether a line must carry real measurements before it can be produced.
 * The customer's explicit `fit` choice wins; without one (older clients),
 * a made-to-measure-only product is assumed to need them. */
export function requiresMeasurements(item: {
  fit?: string | null;
  size: string;
  sizingMode: SizingMode;
}): boolean {
  if (item.fit === 'measure') return true;
  if (item.size === MADE_TO_MEASURE_SIZE) return true;
  if (item.fit === undefined || item.fit === null)
    return item.sizingMode === SizingMode.made_to_measure;
  return false;
}

/** Whether a product's stock counters are reserved/decremented by orders.
 * The single rule shared by order creation, payment confirmation and
 * reservation release — made-to-measure-only products are cut per order and
 * never touch stock. */
export function isStockTracked(product: { sizingMode: SizingMode }): boolean {
  return product.sizingMode !== SizingMode.made_to_measure;
}

/** Validates a measurement `values` payload: a flat object of string keys
 * to finite numbers greater than zero. Returns an error message or null. */
export function measurementValuesError(values: unknown): string | null {
  if (values === undefined || values === null) return null;
  if (typeof values !== 'object' || Array.isArray(values))
    return 'measurement.values must be an object of measurement name to number';
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
      return `measurement.values.${key} must be a number greater than 0`;
  }
  return null;
}

/** For a line that requires measurements: a saved profile, or a non-empty
 * manual set of valid values. Returns an error message or null. */
export function missingMeasurementsError(
  measurement: { mode: string; profileId?: string; values?: unknown },
  productName: string,
): string | null {
  if (measurement.mode === 'profile' && measurement.profileId) return null;
  if (
    measurement.mode === 'manual' &&
    measurement.values &&
    typeof measurement.values === 'object' &&
    Object.keys(measurement.values).length > 0 &&
    measurementValuesError(measurement.values) === null
  )
    return null;
  return `${productName} is cut to measure — add your measurements (a saved profile or manual values) before placing the order`;
}
