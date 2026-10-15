"use client";

// Choices made in the bag that checkout should honour: promo code and gift
// options. Session-scoped so they survive navigation but not a new visit.
// Prices are never stored here; checkout re-validates the code server-side.

import { useCallback, useSyncExternalStore } from "react";

export interface CheckoutPrefs {
  couponCode?: string;
  giftWrap?: boolean;
  giftMessage?: string;
}

const KEY = "momen.checkout.prefs";
const EVENT = "momen:checkout-prefs";
const EMPTY: CheckoutPrefs = {};
let cache: { raw: string | null; value: CheckoutPrefs } = { raw: null, value: EMPTY };

function read(): CheckoutPrefs {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.value;
  let value = EMPTY;
  try {
    value = raw ? (JSON.parse(raw) as CheckoutPrefs) : EMPTY;
  } catch {
    value = EMPTY;
  }
  cache = { raw, value };
  return value;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useCheckoutPrefs() {
  const prefs = useSyncExternalStore(subscribe, read, () => EMPTY);
  const update = useCallback((patch: Partial<CheckoutPrefs>) => {
    const next = { ...read(), ...patch };
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — choices last for this page only
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { prefs, update, clear };
}
