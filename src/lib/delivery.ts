"use client";

// Delivery pricing and timelines, resolved exactly as checkout does: the
// active admin-configured zone for the destination country, falling back to
// the global production settings. One source so the bag, PDP and checkout
// never disagree.

import { useMemo } from "react";
import { useAdminStore } from "./admin/store";
import { addBusinessDays } from "./format";

export function useDeliverySettings(country = "Nigeria") {
  const { deliveryZones, productionSettings } = useAdminStore();
  return useMemo(() => {
    const zone = deliveryZones.find((z) => z.active && z.countries.includes(country));
    return {
      zone,
      standardDays: zone?.standardDays ?? productionSettings.standardDays,
      expressDays: zone?.expressDays ?? productionSettings.expressDays,
      standardFee: zone?.standardFee ?? productionSettings.standardFee,
      expressFee: zone?.expressFee ?? productionSettings.expressFee,
      expressAvailable: zone?.expressAvailable ?? true,
      freeDeliveryThreshold: zone?.freeDeliveryThreshold,
    };
  }, [deliveryZones, productionSettings, country]);
}

/** "Arrives by Fri, 18 Oct" for a product, given its production window plus
 * the zone's delivery days. Returns null until settings are loaded. */
export function estimateArrival(productionDays: [number, number], deliveryDays: [number, number], from = new Date()) {
  const latest = (productionDays?.[1] ?? 0) + (deliveryDays?.[1] ?? 0);
  if (!latest) return null;
  return addBusinessDays(from, latest);
}

export function formatArrival(date: Date) {
  return date.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}
