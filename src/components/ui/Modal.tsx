"use client";

import { Portal } from "./Portal";
import { AnimatePresence, m } from "motion/react";
import { trapFocus, useDialog } from "@/lib/a11y";
import { useScrollLock } from "@/lib/motion/hooks";
import { EASE_HOUSE } from "@/lib/motion/ease";

/** Accessible dialog: focus trap, Escape to close, focus restored on close,
 * page scroll locked. Slides up as a sheet on mobile, centred on desktop;
 * `side` turns it into a right-hand drawer. */
export function Modal({
  open,
  onClose,
  title,
  children,
  side = false,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  side?: boolean;
  wide?: boolean;
}) {
  const ref = useDialog<HTMLDivElement>(open, onClose);
  useScrollLock(open);

  return (
<Portal>
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 z-[125] flex ${side ? "justify-end" : "items-end justify-center sm:items-center sm:p-6"}`}>
          <m.div
            aria-hidden
            className="absolute inset-0 bg-night/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <m.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onKeyDown={trapFocus}
            data-lenis-prevent
            className={
              side
                ? "relative flex h-full w-full max-w-md flex-col bg-ivory shadow-2xl"
                : `relative flex max-h-[92vh] w-full flex-col bg-ivory shadow-2xl ${wide ? "sm:max-w-4xl" : "sm:max-w-xl"}`
            }
            initial={side ? { x: "100%" } : { y: "100%", opacity: 0.6 }}
            animate={side ? { x: 0 } : { y: 0, opacity: 1 }}
            exit={side ? { x: "100%" } : { y: "100%", opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE_HOUSE }}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-line px-6 py-5">
              <h2 className="display text-2xl">{title}</h2>
              <button type="button" onClick={onClose} className="label px-2 py-2 text-ink/60 hover:text-ink">
                Close
              </button>
            </header>
            <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
</Portal>
  );
}
