import { WORDMARK_PATHS, WORDMARK_VIEWBOX } from "./wordmark-paths";

/** The momen. logo, traced from the brand's own artwork. Inherits the text
 * colour, and scales with font-size (height 0.62em) so `text-[…]` classes
 * size it; pass `fluid` to fill its container's width instead. */
export function Wordmark({ className = "", fluid = false, title = "momen." }: { className?: string; fluid?: boolean; title?: string }) {
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      fill="currentColor"
      role="img"
      aria-label={title}
      className={`inline-block ${fluid ? "h-auto w-full" : ""} ${className}`}
      style={fluid ? undefined : { height: "0.62em", width: "auto" }}
    >
      {WORDMARK_PATHS.map((d, i) => (
        <path key={i} d={d} fillRule="evenodd" />
      ))}
    </svg>
  );
}

/** Logo lockup with the "CLOTHINGS" line set beneath, as on the labels. */
export function WordmarkLockup({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col items-center ${className}`}>
      <Wordmark />
      <span aria-hidden className="mt-[0.18em] pl-[0.7em] font-body text-[0.16em] font-semibold uppercase tracking-[0.7em]">
        Clothings
      </span>
    </span>
  );
}
