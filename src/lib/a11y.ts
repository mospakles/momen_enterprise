"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab focus inside a dialog element (attach to its onKeyDown). */
export function trapFocus(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== "Tab") return;
  const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
  if (nodes.length === 0) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/** Dialog behaviour: Escape closes, focus moves inside on open and returns to
 * the previously focused element on close. Returns a ref for the panel. */
export function useDialog<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => {
      const el = ref.current;
      const target = el?.querySelector<HTMLElement>("[data-autofocus]") ?? el?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }, 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);

    // Everything outside the dialog becomes inert (unreachable by keyboard and
    // hidden from assistive tech). Dialogs render through <Portal>, so their
    // top-level node is a direct child of <body>.
    const own = ref.current?.closest("body > *");
    const silenced: HTMLElement[] = [];
    if (own) {
      for (const child of Array.from(document.body.children) as HTMLElement[]) {
        if (child === own || child.inert || child.tagName === "SCRIPT" || child.hasAttribute("data-keep-active")) continue;
        child.inert = true;
        silenced.push(child);
      }
    }

    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
      silenced.forEach((el) => (el.inert = false));
      previous?.focus?.();
    };
  }, [open]);

  return ref;
}
