"use client";

// The opening moment: the wordmark rises letter by letter, the full stop
// lands, then the page opens like a curtain being drawn up. ~1.5s, skippable
// (click, tap or any key), once per browser session. Returning visitors in the
// same session never see it: an inline script hides it before first paint.

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, m } from "motion/react";
import { EASE_CURTAIN, EASE_HOUSE } from "@/lib/motion/ease";
import { usePrefersReducedMotion, useScrollLock } from "@/lib/motion/hooks";
import { Wordmark } from "@/components/brand/Wordmark";

const INTRO_KEY = "momen.intro.seen";

const noop = () => () => undefined;
const readSeen = () => {
  try {
    return sessionStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return true;
  }
};

/** True once the intro has played this session (false during SSR). */
export function useIntroSeen() {
  return useSyncExternalStore(noop, readSeen, () => false);
}


export default function Intro({ onDone }: { onDone: () => void }) {
  const reduce = usePrefersReducedMotion();
  const [open, setOpen] = useState(true);
  useScrollLock(open);

  useEffect(() => {
    const finish = () => setOpen(false);
    const id = window.setTimeout(finish, reduce ? 500 : 1350);
    window.addEventListener("keydown", finish);
    window.addEventListener("wheel", finish, { passive: true });
    window.addEventListener("touchmove", finish, { passive: true });
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", finish);
      window.removeEventListener("wheel", finish);
      window.removeEventListener("touchmove", finish);
    };
  }, [reduce]);

  return (
    <>
      {/* Runs during HTML parsing, before paint: hides the overlay for
          visitors who've already seen it this session. */}
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem("${INTRO_KEY}")==="1")document.documentElement.dataset.intro="seen"}catch(e){}`,
        }}
      />
      <AnimatePresence
        onExitComplete={() => {
          try {
            sessionStorage.setItem(INTRO_KEY, "1");
          } catch {
            // private mode — the intro simply plays again next time
          }
          onDone();
        }}
      >
        {open && (
          <m.div
            key="intro"
            data-intro-overlay
            data-tone="dark"
            role="presentation"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[220] flex cursor-pointer items-center justify-center bg-night text-bone"
            exit={reduce ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)" }}
            initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
            transition={{ duration: reduce ? 0.4 : 0.9, ease: EASE_CURTAIN }}
          >
            <m.div
              className="flex w-[78vw] max-w-[760px] flex-col items-center"
              exit={reduce ? undefined : { y: -40, opacity: 0 }}
              transition={{ duration: 0.6, ease: EASE_HOUSE }}
            >
              {/* The logo draws on left to right, like a line being stitched. */}
              <m.div
                className="w-full"
                initial={reduce ? { opacity: 0 } : { clipPath: "inset(0% 100% 0% 0%)", y: 18 }}
                animate={reduce ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0%)", y: 0 }}
                transition={{ duration: 1, ease: EASE_HOUSE, delay: 0.05 }}
              >
                <Wordmark fluid />
              </m.div>
              <m.span
                aria-hidden
                className="label mt-5 text-bone/70 sm:mt-7"
                initial={{ opacity: 0, letterSpacing: "0.2em" }}
                animate={{ opacity: 1, letterSpacing: "0.9em" }}
                transition={{ duration: 1.1, ease: EASE_HOUSE, delay: 0.45 }}
              >
                Clothings
              </m.span>
            </m.div>

            <m.p
              className="label absolute bottom-10 left-1/2 -translate-x-1/2 text-bone/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              Lagos — Tailored heritage
            </m.p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className="label absolute right-5 top-5 px-3 py-2 text-bone/60 transition-colors hover:text-bone focus-visible:text-bone sm:right-8 sm:top-7"
            >
              Skip
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
