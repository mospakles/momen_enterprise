"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const noop = () => () => undefined;

/** Renders children directly under <body>, so dialogs can mark the rest of
 * the page inert. Renders nothing during SSR. */
export function Portal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}
