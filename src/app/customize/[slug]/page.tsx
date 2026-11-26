"use client";

// The bespoke order flow for one style: design (fabric, colour, details) →
// measurements (only what this style needs, guided) → optional inspiration →
// review with a full price breakdown → checkout. Autosaved, so nothing is
// lost if the customer goes back, leaves, or comes back later.

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";
import { useCart } from "@/lib/cart-context";
import { useMeasurements } from "@/lib/measurement-context";
import { toast } from "@/lib/toast";
import { formatNaira } from "@/lib/format";
import { apiAssetUrl, apiRequest } from "@/lib/api";
import type { CustomOrderDetails, MeasurementUnit, MeasurementValues, Product } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import MeasurementCapture from "@/components/measurement/MeasurementCapture";
import { effectivePrice, sizingModeOf } from "@/lib/product-utils";
import { fieldGuide, resolveMeasurementPlan, type MeasurementPlan } from "@/lib/measurement-guide";

const MAX_REFERENCE_IMAGES = 6;
const MAX_UPLOAD_BYTES = 1.8 * 1024 * 1024;

export default function CustomizePage() {
  const { slug } = useParams<{ slug: string }>();
  const { products, isReady } = useAdminStore();

  if (!isReady) return <div className="mx-auto max-w-4xl px-4 py-24" />;

  const product = products.find((p) => p.slug === slug && p.publishStatus === "published");

  if (!product || !product.customizable) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl">This design isn&rsquo;t available to customize</h1>
        <p className="mt-3 text-ink/60">Browse the Made-to-Measure collection for pieces you can design.</p>
        <Link href="/made-to-measure" className="eyebrow mt-6 inline-block text-brass hover:underline">
          ← Back to Made-to-Measure
        </Link>
      </div>
    );
  }

  return <Wizard product={product} />;
}

interface Draft {
  size: string;
  sizingChoice: "standard" | "measure";
  fabricId?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contrastColor?: string;
  styleChoices: Record<string, string>;
  measurementMode: "profile" | "manual" | "guided" | "pending";
  profileId?: string;
  measurementValues: MeasurementValues;
  measurementUnit: MeasurementUnit;
  referenceImages: string[];
  referenceNotes: string;
  specialInstructions: string;
  quantity: number;
  /** The style picture chosen to have made. */
  look?: string;
  /** Date needed by, YYYY-MM-DD. */
  neededBy?: string;
}

type StepKey = "customize" | "measurements" | "preferences" | "review";

/** Every picture of the style, once: the looks a customer can choose from. */
function looksOf(product: Product) {
  return [...new Set([...product.colors.flatMap((c) => c.images ?? []), ...product.images])];
}

/** Bespoke is cut in 10 to 21 business days: about four weeks to be safe. */
const SAFE_LEAD_DAYS = 28;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const daysUntil = (day: string) => Math.round((new Date(`${day}T12:00:00`).getTime() - Date.now()) / 86_400_000);

function draftKey(slug: string) {
  return `momen.customize-draft.${slug}`;
}

function defaultDraft(product: Product): Draft {
  return {
    size: product.sizes[Math.floor(product.sizes.length / 2)] ?? "M",
    sizingChoice: sizingModeOf(product) === "made-to-measure" ? "measure" : "standard",
    fabricId: undefined,
    primaryColor: product.colors[0]?.name,
    secondaryColor: undefined,
    contrastColor: undefined,
    styleChoices: {},
    measurementMode: "pending",
    profileId: undefined,
    measurementValues: {},
    measurementUnit: "cm",
    referenceImages: [],
    referenceNotes: "",
    specialInstructions: "",
    quantity: 1,
  };
}

function Wizard({ product }: { product: Product }) {
  const router = useRouter();
  const { fabrics, colorSwatches, customizationGroups, categories, measurementFieldDefs } = useAdminStore();
  const { addCustomItem } = useCart();
  const { profiles } = useMeasurements();

  const [draft, setDraft] = useState<Draft>(() => {
    if (typeof window === "undefined") return defaultDraft(product);
    try {
      const raw = localStorage.getItem(draftKey(product.slug));
      return raw ? { ...defaultDraft(product), ...JSON.parse(raw) } : defaultDraft(product);
    } catch {
      return defaultDraft(product);
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(product.slug), JSON.stringify(draft));
    } catch {}
  }, [draft, product.slug]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const availableFabrics = useMemo(() => fabrics.filter((f) => f.available && (product.fabricIds ?? []).includes(f.id)), [fabrics, product.fabricIds]);
  const styleGroups = useMemo(
    () => product.customization.filter((c) => c.enabled && c.groupId !== "colour" && c.groupId !== "fabric").map((c) => ({ ...c, group: customizationGroups.find((g) => g.id === c.groupId) })).filter((c) => c.group),
    [product.customization, customizationGroups]
  );
  const plan = useMemo(() => resolveMeasurementPlan(product, categories, measurementFieldDefs), [product, categories, measurementFieldDefs]);

  const needsMeasurements = sizingModeOf(product) === "made-to-measure" || (sizingModeOf(product) === "both" && draft.sizingChoice === "measure");
  const hasSizingChoice = sizingModeOf(product) === "both";
  const allowsReferences = product.referenceImagesAllowed || product.specialInstructionsAllowed;

  const steps = useMemo(() => {
    const list: { key: StepKey; label: string; hint: string }[] = [{ key: "customize", label: "Design", hint: "Fabric, colour and details" }];
    if (needsMeasurements) list.push({ key: "measurements", label: "Measurements", hint: `${plan.fields.length} measurements, guided` });
    if (allowsReferences) list.push({ key: "preferences", label: "Inspiration", hint: "Optional photos and notes" });
    list.push({ key: "review", label: "Review", hint: "Check and pay" });
    return list;
  }, [needsMeasurements, allowsReferences, plan.fields.length]);

  const [stepIndex, setStepIndex] = useState(0);
  const clampedIndex = Math.min(stepIndex, steps.length - 1);
  const currentKey = steps[clampedIndex].key;
  const [designErrors, setDesignErrors] = useState<string[]>([]);
  const [placing, setPlacing] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Pricing — every component is admin-configured, never hardcoded.
  const basePrice = effectivePrice(product);
  const fabric = availableFabrics.find((f) => f.id === draft.fabricId);
  const fabricCost = fabric?.additionalCost ?? 0;
  const chosenStyles = styleGroups
    .map((c) => ({ group: c.group!, choice: c.group?.choices.find((ch) => ch.id === draft.styleChoices[c.groupId]) }))
    .filter((c): c is { group: NonNullable<typeof c.group>; choice: NonNullable<typeof c.choice> } => Boolean(c.choice));
  const styleCost = chosenStyles.reduce((sum, c) => sum + c.choice.additionalCost, 0);
  const customizationCost = fabricCost + styleCost;
  const unitPrice = basePrice + customizationCost;
  const total = unitPrice * draft.quantity;

  const measurementFilled = !needsMeasurements || draft.measurementMode === "profile" || draft.measurementMode === "manual";

  function designProblems() {
    const problems: string[] = [];
    if (availableFabrics.length > 0 && !draft.fabricId) problems.push("Choose a fabric.");
    if (!draft.primaryColor) problems.push("Choose a main colour.");
    for (const c of styleGroups) if (c.required && !draft.styleChoices[c.groupId]) problems.push(`Choose a ${c.group!.name.toLowerCase()}.`);
    if (!needsMeasurements && sizingModeOf(product) !== "made-to-measure" && !draft.size) problems.push("Choose a size.");
    return problems;
  }

  function goTo(index: number) {
    if (index > clampedIndex) {
      // Can't jump past an unfinished step.
      const designIssues = designProblems();
      if (designIssues.length) {
        setDesignErrors(designIssues);
        setStepIndex(0);
        return;
      }
      const mIndex = steps.findIndex((s) => s.key === "measurements");
      if (mIndex >= 0 && index > mIndex && !measurementFilled) {
        setStepIndex(mIndex);
        toast("Add your measurements first", { description: "Save them at the end of the measuring steps.", variant: "error" });
        return;
      }
    }
    setDesignErrors([]);
    setStepIndex(index);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function addToBag(thenCheckout: boolean) {
    if (placing) return;
    if (designProblems().length || !measurementFilled) return goTo(steps.length - 1);
    setPlacing(true);
    const customOrder: CustomOrderDetails = {
      fabricId: draft.fabricId,
      primaryColor: draft.primaryColor,
      secondaryColor: draft.secondaryColor,
      contrastColor: draft.contrastColor,
      referenceImages: draft.referenceImages,
      referenceNotes: draft.referenceNotes || undefined,
      specialInstructions: draft.specialInstructions || undefined,
      look: draft.look,
      neededBy: draft.neededBy,
    };
    addCustomItem({
      product,
      size: needsMeasurements ? "Made-to-Measure" : draft.size,
      color: draft.primaryColor ?? product.colors[0]?.name ?? "",
      quantity: draft.quantity,
      fit: needsMeasurements ? "measure" : "standard",
      measurement: needsMeasurements
        ? draft.measurementMode === "profile"
          ? { mode: "profile", profileId: draft.profileId, unit: draft.measurementUnit }
          : { mode: "manual", values: draft.measurementValues, unit: draft.measurementUnit }
        : undefined,
      customizations: draft.styleChoices,
      customOrder,
      customizationCost,
    });
    try {
      localStorage.removeItem(draftKey(product.slug));
      localStorage.removeItem(`measure-draft-${product.slug}-wizard`);
    } catch {}
    toast(thenCheckout ? "Added, taking you to checkout" : "Added to your bag", { description: product.name, variant: "success" });
    router.push(thenCheckout ? "/checkout" : "/cart");
  }

  const isLast = currentKey === "review";
  const continueLabel = isLast ? "" : `Continue to ${steps[clampedIndex + 1].label.toLowerCase()}`;

  return (
    <div ref={topRef} className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pb-16">
      <Link href={`/product/${product.slug}`} className="label link-line text-ink/60 hover:text-ink">
        ← {product.name}
      </Link>
      <p className="label mt-6 text-clay">Bespoke · {plan.styleName}</p>
      <h1 className="display mt-2 text-[clamp(2.1rem,4.5vw,3.2rem)]">Design your {product.name}</h1>

      {/* Progress: completed steps are clickable, later ones are locked
          until the earlier ones are done. */}
      <nav aria-label="Bespoke order progress" className="mt-8">
        <ol className="grid grid-cols-[repeat(var(--n),minmax(0,1fr))] gap-1.5" style={{ "--n": steps.length + 1 } as React.CSSProperties}>
          {[...steps, { key: "checkout" as const, label: "Checkout", hint: "Delivery and payment" }].map((s, i) => {
            const current = i === clampedIndex;
            const doneStep = i < clampedIndex;
            const reachable = s.key !== "checkout" && i <= clampedIndex + 1;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => goTo(i)}
                  aria-current={current ? "step" : undefined}
                  className="group block w-full text-left disabled:cursor-default"
                >
                  <span className={`block h-1 ${current ? "bg-ink" : doneStep ? "bg-brass" : "bg-line"}`} />
                  <span className={`mt-2 flex items-center gap-1.5 text-xs ${current ? "font-medium text-ink" : doneStep ? "text-ink/70" : "text-ink/40"}`}>
                    <span aria-hidden>{doneStep ? "✓" : i + 1}</span>
                    <span className={current ? "" : "hidden sm:inline"}>{s.label}</span>
                  </span>
                  <span className="mt-0.5 hidden text-[11px] text-ink/45 lg:block">{s.hint}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {currentKey === "customize" && (
            <>
              <CustomizeStep
                product={product}
                draft={draft}
                update={update}
                availableFabrics={availableFabrics}
                styleGroups={styleGroups}
                colorSwatches={colorSwatches}
                hasSizingChoice={hasSizingChoice}
                plan={plan}
              />
              {designErrors.length > 0 && (
                <div role="alert" className="mt-8 border-l-2 border-error bg-bone/60 px-4 py-3 text-sm text-error">
                  {designErrors.map((e) => (
                    <p key={e}>{e}</p>
                  ))}
                </div>
              )}
            </>
          )}
          {currentKey === "measurements" && (
            <div>
              <h2 className="display text-3xl">Your measurements</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/65">
                A {plan.styleName.toLowerCase()} is made of {plan.pieces.length > 1 ? `${plan.pieces.length} pieces: ${plan.pieces.map((p) => p.title.toLowerCase()).join(", ")}` : "one piece"}. We
                only ask for what these need{profiles.length ? ", and you can reuse saved measurements" : ""}.
              </p>
              <div className="mt-6">
                <MeasurementCapture
                  product={product}
                  storageKey={`measure-draft-${product.slug}-wizard`}
                  finishLabel="Save and continue"
                  onSaved={(payload) => {
                    setDraft((d) => ({
                      ...d,
                      measurementMode: payload.mode,
                      profileId: payload.profileId,
                      measurementValues: payload.values ?? {},
                      measurementUnit: payload.unit,
                    }));
                    // Not goTo(): its "measurements saved?" check would still
                    // see the state from before this save.
                    setStepIndex(clampedIndex + 1);
                    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                  }}
                />
              </div>
            </div>
          )}
          {currentKey === "preferences" && <PreferencesStep product={product} draft={draft} update={update} />}
          {currentKey === "review" && (
            <ReviewStep
              product={product}
              draft={draft}
              fabric={fabric}
              chosenStyles={chosenStyles}
              needsMeasurements={needsMeasurements}
              plan={plan}
              basePrice={basePrice}
              total={total}
              profileLabel={profiles.find((p) => p.id === draft.profileId)?.label}
              onEditStep={(key) => goTo(steps.findIndex((s) => s.key === key))}
            />
          )}

          <div className="mt-10 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
            {clampedIndex > 0 && (
              <Button variant="secondary" type="button" onClick={() => goTo(clampedIndex - 1)}>
                Back to {steps[clampedIndex - 1].label.toLowerCase()}
              </Button>
            )}
            {!isLast && currentKey !== "measurements" && (
              <Button type="button" onClick={() => goTo(clampedIndex + 1)}>
                {continueLabel}
              </Button>
            )}
            {currentKey === "measurements" && measurementFilled && (
              <Button type="button" onClick={() => goTo(clampedIndex + 1)}>
                {continueLabel}
              </Button>
            )}
            {isLast && (
              <>
                <Button type="button" size="lg" onClick={() => addToBag(true)} disabled={placing}>
                  Continue to checkout · {formatNaira(total)}
                </Button>
                <Button type="button" variant="ghost" onClick={() => addToBag(false)} disabled={placing}>
                  Add to bag and keep shopping
                </Button>
              </>
            )}
          </div>
        </div>

        <aside className="h-fit border border-line p-5 lg:sticky lg:top-24" aria-label="Order summary">
          <div className="flex gap-4 lg:block">
            <div className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden bg-bone lg:mb-4 lg:w-full">
              {(draft.look ?? product.images[0]) && <Image src={draft.look ?? product.images[0]} alt={product.name} fill sizes="(min-width:1024px) 340px, 96px" unoptimized={/^https?:/.test(draft.look ?? product.images[0])} className="object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="display text-xl">{product.name}</p>
              <p className="mt-1 text-xs text-ink/55">
                {needsMeasurements ? "Cut to your measurements" : `Standard size ${draft.size}`}
                {draft.primaryColor ? ` · ${colourName(draft.primaryColor)}` : ""}
              </p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <Row label="Base price" value={formatNaira(basePrice)} />
            {fabric && <Row label={`Fabric: ${fabric.name}`} value={fabricCost > 0 ? `+${formatNaira(fabricCost)}` : "Included"} />}
            {chosenStyles.map(({ group, choice }) => (
              <Row key={group.id} label={`${group.name}: ${choice.label}`} value={choice.additionalCost > 0 ? `+${formatNaira(choice.additionalCost)}` : "Included"} />
            ))}
            {draft.quantity > 1 && <Row label="Quantity" value={`× ${draft.quantity}`} />}
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <p className="font-medium">Total</p>
            <p className="display text-2xl">{formatNaira(total)}</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink/55">Delivery and any express production fee are added at checkout, before you pay.</p>
          {product.productionDays && (
            <p className="mt-3 text-xs text-ink/65">
              Made in {product.productionDays.standard[0]}–{product.productionDays.standard[1]} days
              {product.expressEligible ? ` · express ${product.productionDays.express[0]}–${product.productionDays.express[1]} days` : ""}.
            </p>
          )}
        </aside>
      </div>

      {/* Phone: price and the next action always in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-ivory/95 px-4 py-3 backdrop-blur lg:hidden">
        <div>
          <p className="text-[11px] text-ink/55">Total</p>
          <p className="display text-lg leading-none">{formatNaira(total)}</p>
        </div>
        {isLast ? (
          <button type="button" onClick={() => addToBag(true)} disabled={placing} className="min-h-11 bg-ink px-5 text-sm text-ivory disabled:opacity-50">
            Checkout
          </button>
        ) : currentKey !== "measurements" || measurementFilled ? (
          <button type="button" onClick={() => goTo(clampedIndex + 1)} className="min-h-11 bg-ink px-5 text-sm text-ivory">
            Continue
          </button>
        ) : (
          <p className="max-w-[11rem] text-right text-xs text-ink/60">Save your measurements to continue</p>
        )}
      </div>
    </div>
  );
}

function colourName(value: string) {
  return value.startsWith("custom:") ? `Custom ${value.slice(7)}` : value;
}

/* ─────────────────────────────── Step 1: Customize ─────────────────────────────── */

function CustomizeStep({
  product,
  draft,
  update,
  availableFabrics,
  styleGroups,
  colorSwatches,
  hasSizingChoice,
  plan,
}: {
  product: Product;
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  availableFabrics: { id: string; name: string; image: string; description: string; additionalCost: number; category: string }[];
  styleGroups: { groupId: string; required: boolean; group?: { id: string; name: string; description?: string; choices: { id: string; label: string; additionalCost: number; available: boolean }[] } }[];
  colorSwatches: { id: string; name: string; hex: string }[];
  hasSizingChoice: boolean;
  plan: MeasurementPlan;
}) {
  const looks = looksOf(product);
  const today = isoDay(new Date());
  const tight = draft.neededBy ? daysUntil(draft.neededBy) < SAFE_LEAD_DAYS : false;
  return (
    <div className="space-y-10">
      {looks.length > 1 && (
        <section aria-labelledby="look-heading">
          <p id="look-heading" className="eyebrow mb-1">Which look?</p>
          <p className="mb-3 text-xs text-ink/55">Tap the picture closest to what you want made. Our tailors work from it.</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="radiogroup" aria-labelledby="look-heading">
            {looks.map((src, i) => (
              <button
                key={src}
                type="button"
                role="radio"
                aria-checked={draft.look === src}
                aria-label={`Look ${i + 1} of ${looks.length}`}
                onClick={() => update("look", draft.look === src ? undefined : src)}
                className={`relative aspect-[4/5] overflow-hidden bg-bone transition-shadow ${draft.look === src ? "shadow-[0_0_0_2px_var(--color-ivory),0_0_0_4px_var(--color-ink)]" : "opacity-85 hover:opacity-100"}`}
              >
                <Image src={src} alt="" fill sizes="120px" unoptimized={/^https?:/.test(src)} className="object-cover object-top" />
                {draft.look === src && <span className="absolute bottom-1 left-1 bg-ink px-1.5 py-0.5 text-[10px] text-ivory">Chosen</span>}
              </button>
            ))}
          </div>
          {!draft.look && <p className="mt-2 text-xs text-ink/50">Optional, but it helps us get it right first time.</p>}
        </section>
      )}

      {availableFabrics.length > 0 && (
        <section>
          <p className="eyebrow mb-1">Fabric</p>
          <p className="mb-3 text-xs text-ink/55">Prices include the fabric. Some cloths add to the price, shown on each.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {availableFabrics.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={draft.fabricId === f.id}
                onClick={() => update("fabricId", f.id)}
                className={`border p-2.5 text-left ${draft.fabricId === f.id ? "border-brass bg-brass/5" : "border-line hover:border-ink"}`}
              >
                <div className="relative aspect-square overflow-hidden bg-ivory-deep">
                  {f.image ? (
                    <Image src={f.image} alt={f.name} fill className="object-cover" sizes="140px" unoptimized />
                  ) : (
                    <span className="display absolute inset-0 flex items-center justify-center p-2 text-center text-sm text-ink/50">{f.category}</span>
                  )}
                </div>
                <p className="mt-2 text-xs font-medium">{f.name}</p>
                <p className="text-[11px] text-ink/45">{f.additionalCost > 0 ? `+${formatNaira(f.additionalCost)}` : "Included"}</p>
              </button>
            ))}
          </div>
          {draft.fabricId && <p className="mt-2 text-xs text-ink/50">{availableFabrics.find((f) => f.id === draft.fabricId)?.description}</p>}
        </section>
      )}

      <section>
        <p className="eyebrow mb-1">Colour</p>
        <p className="mb-3 text-xs text-ink/55">Pick a main colour. Add a second or accent colour for trims and embroidery if you like.</p>
        <div className="grid gap-5 sm:grid-cols-3">
          <ColorField label="Main colour" required value={draft.primaryColor} onChange={(v) => update("primaryColor", v)} swatches={colorSwatches} />
          <ColorField label="Second colour (optional)" value={draft.secondaryColor} onChange={(v) => update("secondaryColor", v)} swatches={colorSwatches} allowNone />
          <ColorField label="Accent colour (optional)" value={draft.contrastColor} onChange={(v) => update("contrastColor", v)} swatches={colorSwatches} allowNone />
        </div>
      </section>

      {styleGroups.map(({ groupId, group, required }) =>
        group ? (
          <section key={groupId}>
            <p className="eyebrow mb-3">
              {group.name}
              {required ? <span className="ml-2 normal-case tracking-normal text-ink/45">Required</span> : <span className="ml-2 normal-case tracking-normal text-ink/45">Optional</span>}
            </p>
            {group.description && <p className="mb-3 text-xs text-ink/45">{group.description}</p>}
            <div className="flex flex-wrap gap-2">
              {group.choices.filter((c) => c.available).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={draft.styleChoices[groupId] === c.id}
                  onClick={() => update("styleChoices", { ...draft.styleChoices, [groupId]: c.id })}
                  className={`min-h-11 border px-3.5 py-2 text-sm ${draft.styleChoices[groupId] === c.id ? "border-ink bg-ink text-ivory" : "border-line text-ink/70 hover:border-ink"}`}
                >
                  {c.label}
                  {c.additionalCost > 0 && <span className="ml-1.5 text-[11px] opacity-70">+{formatNaira(c.additionalCost)}</span>}
                </button>
              ))}
            </div>
          </section>
        ) : null
      )}

      <section aria-labelledby="fit-heading">
        <p id="fit-heading" className="eyebrow mb-1">How should it fit?</p>
        {hasSizingChoice && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-labelledby="fit-heading">
            {(
              [
                ["measure", "Cut to my measurements", `Our tailors cut every piece to your body. We'll guide you through ${plan.fields.length} measurements on the next step, about ${Math.max(5, Math.round(plan.fields.length * 0.75))} minutes.`],
                ["standard", "A standard size", `Choose from ${product.sizes.join(", ")}. No measuring needed; use the size guide if you're unsure.`],
              ] as const
            ).map(([value, title, body]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={draft.sizingChoice === value}
                onClick={() => update("sizingChoice", value)}
                className={`border p-4 text-left transition-colors ${draft.sizingChoice === value ? "border-ink bg-bone/60" : "border-line hover:border-ink"}`}
              >
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink/60">{body}</p>
              </button>
            ))}
          </div>
        )}
        {(!hasSizingChoice ? sizingModeOf(product) === "standard" : draft.sizingChoice === "standard") && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-ink/60">Size</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={draft.size === s}
                  onClick={() => update("size", s)}
                  className={`min-h-11 min-w-12 border px-3.5 py-2 text-sm ${draft.size === s ? "border-ink bg-ink text-ivory" : "border-line text-ink/70 hover:border-ink"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {sizingModeOf(product) === "made-to-measure" && (
          <p className="mt-2 text-sm leading-relaxed text-ink/65">
            This piece is always cut to your measurements. Next, we&rsquo;ll guide you through the {plan.fields.length} measurements a {plan.styleName.toLowerCase()} needs.
          </p>
        )}
      </section>

      <section aria-labelledby="needed-heading">
        <label id="needed-heading" htmlFor="needed-by" className="eyebrow mb-1 block">When do you need it?</label>
        <p className="mb-3 text-xs text-ink/55">For a wedding, owambe or trip, tell us the date so we can plan your piece around it.</p>
        <input
          id="needed-by"
          type="date"
          min={today}
          value={draft.neededBy ?? ""}
          onChange={(e) => update("neededBy", e.target.value || undefined)}
          className="min-h-11 border border-line bg-ivory px-3 py-2 text-sm focus:border-ink"
        />
        {tight && (
          <p role="status" className="mt-2 max-w-md text-xs leading-relaxed text-terracotta">
            That&rsquo;s under four weeks away. Bespoke takes 10 to 21 business days, so message us before you pay and we&rsquo;ll confirm we can make it in time.
          </p>
        )}
      </section>

      <section>
        <p id="qty-heading" className="eyebrow mb-3">Quantity</p>
        <div className="flex w-fit items-center border border-line" role="group" aria-labelledby="qty-heading">
          <button type="button" aria-label="One fewer" disabled={draft.quantity <= 1} onClick={() => update("quantity", Math.max(1, draft.quantity - 1))} className="flex h-11 w-11 items-center justify-center text-ink/70 hover:text-ink disabled:opacity-30">−</button>
          <span className="w-10 text-center text-sm tabular-nums" aria-live="polite">{draft.quantity}</span>
          <button type="button" aria-label="One more" disabled={draft.quantity >= 10} onClick={() => update("quantity", Math.min(10, draft.quantity + 1))} className="flex h-11 w-11 items-center justify-center text-ink/70 hover:text-ink disabled:opacity-30">+</button>
        </div>
        {draft.quantity > 1 && <p className="mt-2 text-xs text-ink/55">Every piece is made to the same design and measurements.</p>}
      </section>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  swatches,
  required,
  allowNone,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  swatches: { id: string; name: string; hex: string }[];
  required?: boolean;
  allowNone?: boolean;
}) {
  const customHex = value?.startsWith("custom:") ? value.slice(7) : "#A3803E";
  return (
    <div>
      <p className="mb-2 text-xs text-ink/60">
        {label}
        {required && <span className="text-error"> *</span>}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {allowNone && (
          <button
            onClick={() => onChange(undefined)}
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-[9px] text-ink/40 ${!value ? "border-brass" : "border-line"}`}
            title="None"
          >
            ✕
          </button>
        )}
        {swatches.map((s) => (
          <button
            key={s.id}
            onClick={() => onChange(s.name)}
            title={s.name}
            aria-pressed={value === s.name}
            className={`h-7 w-7 rounded-full border-2 ${value === s.name ? "border-brass" : "border-transparent"}`}
            style={{ backgroundColor: s.hex, boxShadow: "0 0 0 1px var(--color-line)" }}
          />
        ))}
        <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-line" title="Custom colour">
          <input type="color" value={customHex} onChange={(e) => onChange(`custom:${e.target.value}`)} className="absolute -left-1 -top-1 h-9 w-9 cursor-pointer" />
        </label>
      </div>
      {value && <p className="mt-1.5 text-[11px] text-ink/45">{value.startsWith("custom:") ? `Custom — ${value.slice(7)}` : value}</p>}
    </div>
  );
}

/* ─────────────────────────────── Step 3: Preferences ─────────────────────────────── */

function PreferencesStep({ product, draft, update }: { product: Product; draft: Draft; update: <K extends keyof Draft>(key: K, value: Draft[K]) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_REFERENCE_IMAGES - draft.referenceImages.length;
    const selected = Array.from(files).slice(0, remaining).filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast("Unsupported file", { description: `${file.name} is not an image.`, variant: "error" });
        return false;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast("File too large", { description: `${file.name} is over 1.8 MB. Try a screenshot or a smaller photo.`, variant: "error" });
        return false;
      }
      return true;
    });
    if (!selected.length) return;

    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of selected) {
        const form = new FormData();
        form.append("file", file);
        form.append("alt", `Customer reference: ${file.name}`);
        const asset = await apiRequest<{ url: string }>("/custom-order-references", { method: "POST", body: form });
        uploaded.push(apiAssetUrl(asset.url));
      }
    } catch (error) {
      toast("An image didn't upload", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    } finally {
      // Keep whatever did upload, even if a later file failed.
      if (uploaded.length) update("referenceImages", [...draft.referenceImages, ...uploaded]);
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const full = draft.referenceImages.length >= MAX_REFERENCE_IMAGES;

  return (
    <div className="space-y-10">
      <div>
        <h2 className="display text-3xl">Inspiration</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/65">Optional. If there&rsquo;s a detail you want that isn&rsquo;t in the options, show or tell us. A tailor reviews every note before cutting and will contact you if anything needs agreeing.</p>
      </div>

      {product.referenceImagesAllowed && (
        <section aria-labelledby="ref-heading">
          <p id="ref-heading" className="eyebrow mb-1">Reference photos</p>
          <p className="mb-4 text-sm text-ink/60">Embroidery, a neckline, a sleeve, a colour pairing: photos or screenshots are perfect. Up to {MAX_REFERENCE_IMAGES}.</p>
          <button
            type="button"
            disabled={uploading || full}
            onClick={() => fileInput.current?.click()}
            className="flex min-h-28 w-full flex-col items-center justify-center gap-1 border-2 border-dashed border-line p-6 text-center text-sm text-ink/60 transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="font-medium">{uploading ? "Uploading…" : full ? "Maximum photos added" : "Add photos"}</span>
            <span className="text-xs text-ink/45">
              {draft.referenceImages.length} of {MAX_REFERENCE_IMAGES} · JPG or PNG, up to 1.8 MB each
            </span>
          </button>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden disabled={uploading} onChange={(e) => void handleFiles(e.target.files)} />

          {draft.referenceImages.length > 0 && (
            <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {draft.referenceImages.map((src, i) => (
                <li key={src} className="relative aspect-square overflow-hidden bg-bone">
                  <Image src={src} alt={`Reference photo ${i + 1}`} fill className="object-cover" unoptimized />
                  <button
                    type="button"
                    aria-label={`Remove reference photo ${i + 1}`}
                    onClick={() => update("referenceImages", draft.referenceImages.filter((_, x) => x !== i))}
                    className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink/80 text-xs text-ivory hover:bg-ink"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {draft.referenceImages.length > 0 && (
            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-sm text-ink/70">What should we take from these photos?</span>
              <textarea
                rows={2}
                value={draft.referenceNotes}
                onChange={(e) => update("referenceNotes", e.target.value)}
                placeholder="e.g. Just the sleeve, or the embroidery on the chest"
                className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-ink"
              />
            </label>
          )}
        </section>
      )}

      {product.specialInstructionsAllowed && (
        <section>
          <label htmlFor="special-notes" className="eyebrow mb-1 block">
            Notes for your tailor
          </label>
          <p className="mb-3 text-sm text-ink/60">How you like it to fit, the occasion, a date you need it by, anything else.</p>
          <textarea
            id="special-notes"
            rows={5}
            maxLength={2000}
            value={draft.specialInstructions}
            onChange={(e) => update("specialInstructions", e.target.value)}
            placeholder="e.g. Slightly roomier through the chest. It's for my wedding on 12 December."
            className="w-full border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </section>
      )}
    </div>
  );
}

/* ─────────────────────────────── Step 4: Review ─────────────────────────────── */

function ReviewStep({
  product,
  draft,
  fabric,
  chosenStyles,
  needsMeasurements,
  plan,
  basePrice,
  total,
  profileLabel,
  onEditStep,
}: {
  product: Product;
  draft: Draft;
  fabric?: { name: string; additionalCost: number };
  chosenStyles: { group: { id: string; name: string }; choice: { label: string; additionalCost: number } }[];
  needsMeasurements: boolean;
  plan: MeasurementPlan;
  basePrice: number;
  total: number;
  profileLabel?: string;
  onEditStep: (key: StepKey) => void;
}) {
  const { measurementFieldDefs } = useAdminStore();
  const colours = [draft.primaryColor, draft.secondaryColor, draft.contrastColor].filter(Boolean).map((c) => colourName(c!));
  const heading = (title: string, step?: StepKey) => (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="eyebrow">{title}</h3>
      {step && (
        <button type="button" onClick={() => onEditStep(step)} className="min-h-10 px-1 text-xs text-clay underline underline-offset-4 hover:text-ink">
          Change <span className="sr-only">{title.toLowerCase()}</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="display text-3xl">Review your order</h2>
        <p className="mt-2 text-sm text-ink/65">Check everything below. You can change any part before you pay.</p>
      </div>

      <section className="border border-line p-5">
        {heading("Design", "customize")}
        <dl className="grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
          <dt className="text-ink/55">Style</dt>
          <dd>{product.name}</dd>
          {fabric && (
            <>
              <dt className="text-ink/55">Fabric</dt>
              <dd>{fabric.name}</dd>
            </>
          )}
          <dt className="text-ink/55">Colour</dt>
          <dd>{colours.join(", ") || "—"}</dd>
          {chosenStyles.map(({ group, choice }) => (
            <Fragment key={group.id}>
              <dt className="text-ink/55">{group.name}</dt>
              <dd>{choice.label}</dd>
            </Fragment>
          ))}
          {draft.look && (
            <>
              <dt className="text-ink/55">Look</dt>
              <dd>
                <span className="relative block aspect-[4/5] w-16 overflow-hidden bg-bone">
                  <Image src={draft.look} alt="The look you chose" fill sizes="64px" unoptimized={/^https?:/.test(draft.look)} className="object-cover object-top" />
                </span>
              </dd>
            </>
          )}
          <dt className="text-ink/55">Fit</dt>
          <dd>{needsMeasurements ? "Cut to your measurements" : `Standard size ${draft.size}`}</dd>
          {draft.neededBy && (
            <>
              <dt className="text-ink/55">Needed by</dt>
              <dd>{new Date(`${draft.neededBy}T12:00:00`).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</dd>
            </>
          )}
          <dt className="text-ink/55">Quantity</dt>
          <dd>{draft.quantity}</dd>
        </dl>
      </section>

      {needsMeasurements && (
        <section className="border border-line p-5">
          {heading("Measurements", "measurements")}
          {draft.measurementMode === "profile" ? (
            <p className="text-sm text-ink/70">Using your saved measurements{profileLabel ? `: “${profileLabel}”` : ""}.</p>
          ) : Object.keys(draft.measurementValues).length === 0 ? (
            <p className="text-sm text-error">No measurements yet. Add them before you continue.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {plan.pieces.map((piece) => (
                <div key={piece.id}>
                  <p className="text-sm font-medium">{piece.title}</p>
                  <ul className="mt-1.5 space-y-1 text-sm">
                    {piece.fields.map((k) => (
                      <li key={k} className="flex justify-between gap-3 border-b border-line/70 pb-1">
                        <span className="text-ink/60">{fieldGuide(k, measurementFieldDefs, plan).label}</span>
                        <span className="tabular-nums">{Number(draft.measurementValues[k]) > 0 ? `${draft.measurementValues[k]} ${draft.measurementUnit}` : "Tailor to decide"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {(product.referenceImagesAllowed || product.specialInstructionsAllowed) && (
        <section className="border border-line p-5">
          {heading("Inspiration", "preferences")}
          {draft.referenceImages.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {draft.referenceImages.map((src, i) => (
                <div key={src} className="relative h-14 w-14 overflow-hidden bg-bone">
                  <Image src={src} alt={`Reference photo ${i + 1}`} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          )}
          {draft.referenceNotes && <p className="text-sm text-ink/70">About the photos: {draft.referenceNotes}</p>}
          <p className="mt-1 text-sm text-ink/70">{draft.specialInstructions || (draft.referenceImages.length ? "" : "None added.")}</p>
          {(draft.referenceImages.length > 0 || draft.specialInstructions) && (
            <p className="mt-3 text-xs leading-relaxed text-ink/55">A tailor reviews these before cutting and will contact you if anything changes the price or timing. Nothing extra is charged without your agreement.</p>
          )}
        </section>
      )}

      <section className="border border-line p-5">
        {heading("Price")}
        <dl className="space-y-2 text-sm">
          <Row label="Base price" value={formatNaira(basePrice)} />
          {fabric && <Row label={`Fabric: ${fabric.name}`} value={fabric.additionalCost > 0 ? `+${formatNaira(fabric.additionalCost)}` : "Included"} />}
          {chosenStyles.map(({ group, choice }) => (
            <Row key={group.id} label={`${group.name}: ${choice.label}`} value={choice.additionalCost > 0 ? `+${formatNaira(choice.additionalCost)}` : "Included"} />
          ))}
          {draft.quantity > 1 && <Row label="Quantity" value={`× ${draft.quantity}`} />}
        </dl>
        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <span className="font-medium">Total for {draft.quantity === 1 ? "this piece" : `${draft.quantity} pieces`}</span>
          <span className="display text-2xl">{formatNaira(total)}</span>
        </div>
        <p className="mt-2 text-xs text-ink/55">Delivery and any express fee are shown at checkout before you pay.</p>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-ink/60">{label}</dt>
      <dd className="shrink-0 text-ink/85">{value}</dd>
    </div>
  );
}
