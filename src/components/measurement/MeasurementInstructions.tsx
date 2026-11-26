"use client";

// How to take one measurement, in plain language: what it is, where the tape
// starts and ends, which way it runs, numbered steps, and the mistakes to avoid.

import { DIRECTION_LABEL, type FieldGuide, type TapeDirection } from "@/lib/measurement-guide";

function DirectionIcon({ direction }: { direction: TapeDirection }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
      {direction === "around" && (
        <>
          <ellipse cx="12" cy="12" rx="9" ry="4" {...common} />
          <path d="M18 7.5l2.6.9-.9 2.6" {...common} />
        </>
      )}
      {direction === "across" && <path d="M3 12h18M6 9l-3 3 3 3M18 9l3 3-3 3" {...common} />}
      {direction === "vertical" && <path d="M12 3v18M9 6l3-3 3 3M9 18l3 3 3-3" {...common} />}
      {direction === "along" && <path d="M5 4c4 3 7 9 8 16M4 7l1-3 3 1M10 19l3 1 1-3" {...common} />}
    </svg>
  );
}

export default function MeasurementInstructions({ guide, compact = false }: { guide: FieldGuide; compact?: boolean }) {
  return (
    <div className="text-sm">
      {guide.what && <p className="leading-relaxed text-ink/75">{guide.what}</p>}

      {(guide.from || guide.direction) && (
        <dl className="mt-4 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">
          {guide.from && (
            <div className="bg-ivory p-3">
              <dt className="label text-ink/50">Tape starts</dt>
              <dd className="mt-1 leading-snug">{guide.from}</dd>
            </div>
          )}
          {guide.to && (
            <div className="bg-ivory p-3">
              <dt className="label text-ink/50">Tape ends</dt>
              <dd className="mt-1 leading-snug">{guide.to}</dd>
            </div>
          )}
          {guide.direction && (
            <div className="bg-ivory p-3">
              <dt className="label text-ink/50">Direction</dt>
              <dd className="mt-1 flex items-center gap-1.5 leading-snug">
                <DirectionIcon direction={guide.direction} />
                {DIRECTION_LABEL[guide.direction]}
              </dd>
            </div>
          )}
        </dl>
      )}

      {guide.steps.length > 0 && (
        <ol className={`space-y-2.5 ${compact ? "mt-4" : "mt-5"}`}>
          {guide.steps.map((step, i) => (
            <li key={i} className="grid grid-cols-[1.75rem_1fr] items-baseline">
              <span className="display text-lg text-clay">{i + 1}</span>
              <span className="leading-relaxed text-ink/80">{step}</span>
            </li>
          ))}
        </ol>
      )}

      {guide.tips.length > 0 && (
        <div className={`border-l-2 border-terracotta bg-bone/60 px-4 py-3 ${compact ? "mt-4" : "mt-5"}`}>
          <p className="label text-terracotta">Avoid these mistakes</p>
          <ul className="mt-2 space-y-1.5 text-ink/75">
            {guide.tips.map((tip, i) => (
              <li key={i} className="leading-relaxed">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {guide.videoUrl && (
        <a href={guide.videoUrl} target="_blank" rel="noopener noreferrer" className="link-line mt-4 inline-block text-xs text-clay">
          Watch a short video of this measurement ↗
        </a>
      )}
    </div>
  );
}
