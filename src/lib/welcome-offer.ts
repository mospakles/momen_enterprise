"use client";

// The first-order welcome offer. The server applies WELCOME10 automatically
// to a customer's first order (momen-api/src/common/storefront-offer.ts); the
// storefront only has to tell people about it. Whether a visitor has seen the
// pop-up or hidden the bar is remembered in this browser only.

import { useCallback, useSyncExternalStore } from "react";

export const WELCOME_CODE = "WELCOME10";
export const WELCOME_PERCENT = 10;

const KEY = "momen.welcome";
const EVENT = "momen:welcome";

interface WelcomeState {
  /** The pop-up has been shown (and closed) once. */
  seen?: boolean;
  /** The announcement bar was dismissed. */
  barHidden?: boolean;
}

let cache: { raw: string | null; value: WelcomeState } = { raw: null, value: {} };
const SERVER: WelcomeState = { seen: true, barHidden: false };

function read(): WelcomeState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return SERVER;
  }
  if (raw === cache.raw) return cache.value;
  let value: WelcomeState = {};
  try {
    value = raw ? (JSON.parse(raw) as WelcomeState) : {};
  } catch {
    value = {};
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

export function useWelcomeOffer() {
  const state = useSyncExternalStore(subscribe, read, () => SERVER);
  const update = useCallback((patch: WelcomeState) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }));
    } catch {
      // storage unavailable: the choice lasts for this page only
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { ...state, update };
}

export const welcomeSaving = (subtotal: number) => Math.round((subtotal * WELCOME_PERCENT) / 100);
