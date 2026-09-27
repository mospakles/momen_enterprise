import { OrderStatus } from '@prisma/client';

// Port of the frontend's `src/lib/order-stages.ts` — kept in lockstep so the
// backend computes the same stage list the storefront/admin UI expects. If
// that file changes, mirror the change here.

export const ORDER_STAGES: OrderStatus[] = [
  OrderStatus.order_placed,
  OrderStatus.payment_confirmed,
  OrderStatus.customization_review,
  OrderStatus.awaiting_measurements,
  OrderStatus.measurements_confirmed,
  OrderStatus.production_queue,
  OrderStatus.in_production,
  OrderStatus.quality_check,
  OrderStatus.ready_for_dispatch,
  OrderStatus.shipped,
  OrderStatus.delivered,
];

interface StageItem {
  isMadeToMeasure: boolean;
  hasCustomOrder: boolean;
}

export function isCustomOrderRequest(items: StageItem[]): boolean {
  return items.some((i) => i.hasCustomOrder);
}

function isMadeToMeasureRequest(items: StageItem[]): boolean {
  return items.some((i) => i.isMadeToMeasure);
}

export function stagesForItems(items: StageItem[]): OrderStatus[] {
  const custom = isCustomOrderRequest(items);
  const mtm = isMadeToMeasureRequest(items);
  return ORDER_STAGES.filter((stage) => {
    if (stage === OrderStatus.customization_review) return custom;
    if (
      stage === OrderStatus.awaiting_measurements ||
      stage === OrderStatus.measurements_confirmed
    )
      return mtm;
    return true;
  });
}
