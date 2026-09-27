"use client";

import { useEffect, useState } from "react";
import { ToastMessage, subscribeToast } from "@/lib/toast";

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return subscribeToast((toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3200);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`fade-up rounded-sm border bg-charcoal px-4 py-3 text-ivory shadow-lg ${
            t.variant === "error" ? "border-error" : "border-brass"
          }`}
        >
          <p className="font-body text-sm font-semibold">{t.title}</p>
          {t.description && <p className="mt-0.5 text-xs text-stone-light/90">{t.description}</p>}
        </div>
      ))}
    </div>
  );
}
