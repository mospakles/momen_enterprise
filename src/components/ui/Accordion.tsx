"use client";

import { useId, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { EASE_HOUSE } from "@/lib/motion/ease";

export function AccordionItem({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="border-b border-line">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-trigger`}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between py-5 text-left font-body text-[0.95rem] text-ink"
        >
          {title}
          <span aria-hidden className={`relative h-3 w-3 transition-transform duration-500 ease-house ${open ? "rotate-45" : ""}`}>
            <span className="absolute left-0 top-1/2 h-px w-3 bg-ink" />
            <span className="absolute left-1/2 top-0 h-3 w-px bg-ink" />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id={`${id}-panel`}
            role="region"
            aria-labelledby={`${id}-trigger`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_HOUSE }}
            className="overflow-hidden"
          >
            <div className="pb-6 text-sm leading-relaxed text-ink/70">{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
