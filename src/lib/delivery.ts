"use client";

// Delivery pricing and timelines from the active admin-configured zone
// (Admin → Delivery) for the destination country. One source so the bag,
// cart, product page, checkout and the admin settings panel never disagree.
// With no zone for a country, fees and days are 0 and `zone` is undefined.

import { useMemo } from "react";
import { useAdminStore } from "./admin/store";
import { addBusinessDays } from "./format";

const place = (value?: string) => {
  const plain = (value ?? "").trim().toLowerCase().replace(/\s+state$/, "").replace(/\s+/g, " ");
  return /^(fct|abuja|fct abuja|federal capital territory)$/.test(plain) ? "fct" : plain;
};

/** Same rule as the API: a zone naming the state, else the whole-country zone.
 * Without a state (bag, product page), the whole-country zone is shown. */
export function useDeliverySettings(country = "Nigeria", state?: string) {
  const { deliveryZones } = useAdminStore();
  return useMemo(() => {
    const inCountry = deliveryZones.filter((z) => z.active && z.countries.some((c) => place(c) === place(country)));
    const zone =
      (state ? inCountry.find((z) => (z.states ?? []).some((s) => place(s) === place(state))) : undefined) ??
      inCountry.find((z) => !(z.states ?? []).length) ??
      inCountry[0];
    return {
      zone,
      standardDays: zone?.standardDays ?? ([0, 0] as [number, number]),
      expressDays: zone?.expressDays ?? ([0, 0] as [number, number]),
      standardFee: zone?.standardFee ?? 0,
      expressFee: zone?.expressFee ?? 0,
      expressAvailable: zone?.expressAvailable ?? true,
      freeDeliveryThreshold: zone?.freeDeliveryThreshold,
      pickupAvailable: zone?.pickupAvailable ?? false,
      pickupLocation: zone?.pickupLocation,
      pickupFee: zone?.pickupFee ?? 0,
    };
  }, [deliveryZones, country, state]);
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
