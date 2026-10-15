"use client";

// Floating "Talk to a stylist" — opens WhatsApp with a prefilled note that
// includes the page the visitor is on. Uses the support phone from admin
// Settings → General; hidden when none is configured.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { useAdminStore } from "@/lib/admin/store";
import { EASE_HOUSE } from "@/lib/motion/ease";

export default function StylistButton() {
  const { systemSettings } = useAdminStore();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const phone = (systemSettings.general.supportPhone ?? "").replace(/[^\d]/g, "");

  // Unobtrusive: appears only after the visitor has scrolled a little.
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!phone) return null;
  const note = encodeURIComponent(`Hello momen. — I'd like some help with sizing / a bespoke piece. (${typeof window !== "undefined" ? window.location.origin : ""}${pathname})`);

  return (
    <AnimatePresence>
      {show && (
        <m.a
          href={`https://wa.me/${phone}?text=${note}`}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.6, ease: EASE_HOUSE }}
          className="group fixed bottom-5 left-5 z-[80] flex items-center gap-2.5 rounded-full border border-ink/10 bg-ivory/95 py-2 pl-2 pr-4 text-ink shadow-[0_10px_30px_rgba(18,17,14,0.12)] backdrop-blur transition-colors hover:bg-ink hover:text-ivory max-lg:bottom-24 sm:bottom-6 sm:left-6"
          aria-label="Talk to a stylist on WhatsApp (opens in a new tab)"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-ivory transition-colors group-hover:bg-ivory group-hover:text-ink">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.6a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" />
            </svg>
          </span>
          <span className="text-xs tracking-wide">Talk to a stylist</span>
        </m.a>
      )}
    </AnimatePresence>
  );
}
