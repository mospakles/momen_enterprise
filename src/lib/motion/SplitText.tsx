"use client";

import { m } from "motion/react";
import { DURATION, EASE_HOUSE } from "./ease";
import { usePrefersReducedMotion } from "./hooks";

type Tag = "h1" | "h2" | "h3" | "p" | "span";

/** Reveals text word by word, each word rising out of its own mask.
 * Screen readers get the whole sentence once via aria-label; the animated
 * fragments are hidden from them.
 *
 * `trigger="inView"` plays on scroll; `trigger="manual"` plays when `play`
 * becomes true (the hero waits for the intro to finish). Use `\n` in `text`
 * to force a line break. */
export function SplitText({
  text,
  as = "span",
  className,
  delay = 0,
  stagger = 0.07,
  trigger = "inView",
  play = true,
}: {
  text: string;
  as?: Tag;
  className?: string;
  delay?: number;
  stagger?: number;
  trigger?: "inView" | "manual";
  play?: boolean;
}) {
  const reduce = usePrefersReducedMotion();
  const Comp = m[as];
  const lines = text.split("\n");
  let index = 0;

  const variants = {
    hidden: reduce ? { opacity: 0 } : { y: "110%" },
    shown: (i: number) => ({
      opacity: 1,
      y: "0%",
      transition: { duration: DURATION.reveal, ease: EASE_HOUSE, delay: delay + i * stagger },
    }),
  };

  const triggerProps =
    trigger === "inView"
      ? { initial: "hidden", whileInView: "shown", viewport: { once: true, amount: 0.4 } }
      : { initial: "hidden", animate: play ? "shown" : "hidden" };

  return (
    <Comp className={className} aria-label={text.replace(/\n/g, " ")} {...triggerProps}>
      {lines.map((line, li) => (
        <span key={li} aria-hidden className="block">
          {line.split(" ").map((word, wi, words) => {
            const i = index++;
            return (
              <span key={wi}>
                <span className="inline-block overflow-hidden pb-[0.14em] -mb-[0.14em] align-bottom">
                  <m.span className="inline-block will-change-transform" custom={i} variants={variants}>
                    {word}
                  </m.span>
                </span>
                {wi < words.length - 1 && " "}
              </span>
            );
          })}
        </span>
      ))}
    </Comp>
  );
}
