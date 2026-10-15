"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ToastMessage, subscribeToast } from "@/lib/toast";
import { EASE_HOUSE } from "@/lib/motion/ease";
import { Portal } from "./Portal";

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return subscribeToast((toast) => {
      setToasts((prev) => [...prev.slice(-2), toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.variant === "error" ? 6000 : 3600);
    });
  }, []);

  return (
    <Portal>
    <div
      data-keep-active
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[200] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <m.div
            key={t.id}
            layout
            role={t.variant === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, transition: { duration: 0.25 } }}
            transition={{ duration: 0.55, ease: EASE_HOUSE }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 bg-night px-5 py-4 text-bone shadow-[0_18px_50px_rgba(18,17,14,0.35)]"
          >
            <span
              aria-hidden
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${t.variant === "error" ? "bg-terracotta-light" : t.variant === "success" ? "bg-sand" : "bg-bone/50"}`}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs leading-relaxed text-bone/65">{t.description}</p>}
            </div>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
    </Portal>
  );
}
