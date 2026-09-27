import { Button } from "@/components/ui/Button";
import MeasurementSilhouette from "@/components/measurement/MeasurementSilhouette";

export interface MtmContent {
  headline?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

const STEPS = [
  "Choose an existing design",
  "Select your preferred fabric",
  "Select colours",
  "Select size",
  "Provide your measurements",
  "Customize the garment",
  "Upload reference images if needed",
  "Add special instructions",
];

export default function MadeToMeasureSection({ content }: { content?: MtmContent }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="order-2 flex justify-center lg:order-1">
          <div className="relative flex h-[420px] w-full max-w-sm items-center justify-center border border-line bg-ivory-deep/40">
            <MeasurementSilhouette className="h-[380px] w-auto text-clay/70" />
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <p className="eyebrow">Made-to-Measure</p>
          <h2 className="mt-2 font-display text-3xl italic sm:text-4xl">
            {content?.headline || "Your Style. Your Measurements. Your Momen."}
          </h2>
          <p className="mt-5 max-w-lg text-ink/70">
            {content?.subheading ||
              "Every made-to-measure piece is designed with you, not pulled off a rack. Choose a piece, make it yours, and place your order — it feels like designing your outfit, not filling out a form."}
          </p>
          <ol className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <li key={step} className="flex gap-2.5 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brass text-[11px] text-brass">
                  {i + 1}
                </span>
                <span className="text-ink/80">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Button href={content?.ctaHref || "/made-to-measure"}>{content?.ctaLabel || "Create Your Custom Look"}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
