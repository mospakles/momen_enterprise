import { SizingMode } from '@prisma/client';

type StockStatus =
  'in-stock' | 'low-stock' | 'made-to-order' | 'out-of-stock';

/** Replaces the frontend's stored `Product.stock` field — derived so it
 * can't drift from the numbers that actually drive it. Made-to-measure
 * items with no fixed stock run are always "made-to-order" regardless of
 * quantity counters, which don't apply to them. */
export function deriveStockStatus(product: {
  sizingMode: SizingMode;
  stockQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
}): StockStatus {
  if (product.sizingMode === 'made_to_measure') return 'made-to-order';
  const available = product.stockQuantity - product.reservedQuantity;
  if (available <= 0) return 'out-of-stock';
  if (available <= product.lowStockThreshold) return 'low-stock';
  return 'in-stock';
}
