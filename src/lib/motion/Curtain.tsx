"use client";

// Page transition between the landing journey and the shop: a curtain of
// ink falls over the page, the route changes underneath it, then the curtain
// lifts to reveal the new page. Not a hard cut. Reduced motion gets a short
// fade instead of the sweep.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { EASE_CURTAIN } from "./ease";
import { usePrefersReducedMotion } from "./hooks";
import { Wordmark } from "@/components/brand/Wordmark";

type Phase = "idle" | "covering" | "covered" | "revealing";

const CurtainContext = createContext<(href: string) => void>(() => undefined);

export function CurtainProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduce = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const target = useRef<string | null>(null);
  const fromPath = useRef<string | null>(null);

  const navigate = useCallback(
    (href: string) => {
      if (phase !== "idle") return;
      target.current = href;
      fromPath.current = pathname;
      router.prefetch(href);
      setPhase("covering");
    },
    [phase, pathname, router],
  );

  // Once the new route has rendered under the curtain, lift it.
  useEffect(() => {
    if (phase === "covered" && pathname !== fromPath.current) {
      const id = window.setTimeout(() => setPhase("revealing"), 120);
      return () => window.clearTimeout(id);
    }
  }, [phase, pathname]);

  // Fallback: never leave the visitor stuck behind the curtain.
  useEffect(() => {
    if (phase !== "covered") return;
    const id = window.setTimeout(() => setPhase("revealing"), 2500);
    return () => window.clearTimeout(id);
  }, [phase]);

  return (
    <CurtainContext.Provider value={navigate}>
      {children}
      <AnimatePresence>
        {(phase === "covering" || phase === "covered") && (
          <m.div
            key="curtain"
            aria-hidden
            className="fixed inset-0 z-[250] flex items-center justify-center bg-night"
            initial={reduce ? { opacity: 0 } : { clipPath: "inset(100% 0% 0% 0%)" }}
            animate={reduce ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0%)" }}
            exit={reduce ? { opacity: 0 } : { clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: reduce ? 0.25 : 0.85, ease: EASE_CURTAIN }}
            onAnimationComplete={() => {
              if (phase !== "covering" || !target.current) return;
              setPhase("covered");
              window.scrollTo(0, 0);
              router.push(target.current);
            }}
          >
            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
            >
              <Wordmark className="text-5xl text-bone sm:text-7xl" />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
      {phase === "revealing" && <RevealDone onDone={() => setPhase("idle")} />}
    </CurtainContext.Provider>
  );
}

function RevealDone({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 900);
    return () => window.clearTimeout(id);
  }, [onDone]);
  return null;
}

/** Navigate with the curtain transition. */
export function useCurtainNavigate() {
  return useContext(CurtainContext);
}
