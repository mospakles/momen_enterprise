"use client";

// The advanced Made-to-Measure customization wizard (Sections 14–27 of the
// brand brief). Reached from a design's "Customize This Design" CTA. Feels
// like designing an outfit — progressive disclosure, one concern per step,
// autosaved so nothing is lost if the customer leaves and comes back.

import { useEffect, useMemo, useRef, useState } from "react";
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
}

function draftKey(slug: string) {
  return `momen.customize-draft.${slug}`;
}

function defaultDraft(product: Product): Draft {
  return {
    size: product.sizes[Math.floor(product.sizes.length / 2)] ?? "M",
    sizingChoice: product.sizingMode === "made-to-measure" ? "measure" : "standard",
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
  const { fabrics, colorSwatches, customizationGroups } = useAdminStore();
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
    localStorage.setItem(draftKey(product.slug), JSON.stringify(draft));
  }, [draft, product.slug]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const availableFabrics = useMemo(() => fabrics.filter((f) => f.available && (product.fabricIds ?? []).includes(f.id)), [fabrics, product.fabricIds]);
  const styleGroups = useMemo(
    () => product.customization.filter((c) => c.enabled && c.groupId !== "colour" && c.groupId !== "fabric").map((c) => ({ ...c, group: customizationGroups.find((g) => g.id === c.groupId) })).filter((c) => c.group),
    [product.customization, customizationGroups]
  );

  const needsMeasurements = product.sizingMode === "made-to-measure" || (product.sizingMode === "both" && draft.sizingChoice === "measure");
  const hasSizingChoice = product.sizingMode === "both";

  const steps = useMemo(() => {
    const list = [{ key: "customize", label: "Customize" }];
    if (needsMeasurements) list.push({ key: "measurements", label: "Measurements" });
    list.push({ key: "preferences", label: "Preferences" });
    list.push({ key: "review", label: "Review" });
    return list;
  }, [needsMeasurements]);

  const [stepIndex, setStepIndex] = useState(0);
  const clampedIndex = Math.min(stepIndex, steps.length - 1);
  const currentKey = steps[clampedIndex].key;

  // Pricing (Section 24) — every component of the price is admin-configured,
  // never hardcoded: fabric additional cost + style customization costs.
  const fabricCost = availableFabrics.find((f) => f.id === draft.fabricId)?.additionalCost ?? 0;
  const styleCost = styleGroups.reduce((sum, c) => {
    const choiceId = draft.styleChoices[c.groupId];
    const choice = c.group?.choices.find((ch) => ch.id === choiceId);
    return sum + (choice?.additionalCost ?? 0);
  }, 0);
  const customizationCost = fabricCost + styleCost;
  const total = (product.price + customizationCost) * draft.quantity;

  const measurementFilled = needsMeasurements && draft.measurementMode !== "pending";
  const canReview = !needsMeasurements || measurementFilled;

  function goNext() {
    if (clampedIndex < steps.length - 1) setStepIndex(clampedIndex + 1);
  }
  function goBack() {
    if (clampedIndex > 0) setStepIndex(clampedIndex - 1);
  }

  function handleAddToBag() {
    const primarySwatch = colorSwatches.find((c) => c.name === draft.primaryColor);
    const customOrder: CustomOrderDetails = {
      fabricId: draft.fabricId,
      primaryColor: draft.primaryColor,
      secondaryColor: draft.secondaryColor,
      contrastColor: draft.contrastColor,
      referenceImages: draft.referenceImages,
      referenceNotes: draft.referenceNotes || undefined,
      specialInstructions: draft.specialInstructions || undefined,
    };
    addCustomItem({
      product,
      size: needsMeasurements ? "Made-to-Measure" : draft.size,
      color: draft.primaryColor ?? product.colors[0]?.name ?? "",
      quantity: draft.quantity,
      measurement: needsMeasurements
        ? draft.measurementMode === "profile"
          ? { mode: "profile", profileId: draft.profileId, unit: draft.measurementUnit }
          : { mode: "manual", values: draft.measurementValues, unit: draft.measurementUnit }
        : undefined,
      customizations: draft.styleChoices,
      customOrder,
      customizationCost,
    });
    localStorage.removeItem(draftKey(product.slug));
    router.push("/cart");
    void primarySwatch;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link href={`/product/${product.slug}`} className="eyebrow text-clay hover:text-brass">
          ← {product.name}
        </Link>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">Customize Your Design</h1>
      </div>

      {/* Progress indicator — Design is already complete (this product was
          chosen); Checkout happens after "Add to Bag". */}
      <div className="mb-10 flex flex-wrap gap-2 text-xs">
        {["Design", ...steps.map((s) => s.label), "Checkout"].map((label, i) => {
          const designDone = i === 0;
          const stepPos = i - 1;
          const isCurrent = stepPos === clampedIndex;
          const isDone = designDone || stepPos < clampedIndex;
          return (
            <div key={label} className={`flex items-center gap-2 ${isCurrent ? "text-ink" : isDone ? "text-ink/60" : "text-ink/30"}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${isCurrent ? "border-brass bg-brass text-ivory" : isDone ? "border-ink/40" : "border-line"}`}>
                {isDone && !isCurrent ? "✓" : i + 1}
              </span>
              {label}
              {i < steps.length + 1 && <span className="mx-1 text-line">—</span>}
            </div>
          );
        })}
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
        <div>
          {currentKey === "customize" && (
            <CustomizeStep
              product={product}
              draft={draft}
              update={update}
              availableFabrics={availableFabrics}
              styleGroups={styleGroups}
              colorSwatches={colorSwatches}
              hasSizingChoice={hasSizingChoice}
            />
          )}
          {currentKey === "measurements" && (
            <div>
              <h2 className="mb-2 font-display text-2xl">Your Measurements</h2>
              <p className="mb-6 text-sm text-ink/60">Choose how you&rsquo;d like to provide measurements for this piece.</p>
              <MeasurementCapture
                garment={product.garment}
                storageKey={`measure-draft-${product.slug}-wizard`}
                fieldOverride={product.measurementFieldKeys}
                onSaved={(payload) => {
                  setDraft((d) => ({
                    ...d,
                    measurementMode: payload.mode,
                    profileId: payload.profileId,
                    measurementValues: payload.values ?? d.measurementValues,
                    measurementUnit: payload.unit,
                  }));
                  toast("Measurements added to your custom order", { variant: "success" });
                }}
              />
              {profiles.length === 0 && <p className="mt-4 text-xs text-ink/40">You have no saved measurement profiles yet on this device — enter measurements manually or use the guided flow.</p>}
            </div>
          )}
          {currentKey === "preferences" && <PreferencesStep draft={draft} update={update} />}
          {currentKey === "review" && (
            <ReviewStep
              product={product}
              draft={draft}
              fabric={availableFabrics.find((f) => f.id === draft.fabricId)}
              styleGroups={styleGroups}
              needsMeasurements={needsMeasurements}
              customizationCost={customizationCost}
              total={total}
              onEditStep={(key) => setStepIndex(steps.findIndex((s) => s.key === key))}
            />
          )}

          <div className="mt-8 flex gap-3">
            {clampedIndex > 0 && (
              <Button variant="secondary" onClick={goBack}>
                Back
              </Button>
            )}
            {currentKey !== "review" ? (
              <Button onClick={goNext} disabled={currentKey === "measurements" && !measurementFilled}>
                Continue
              </Button>
            ) : (
              <Button onClick={handleAddToBag} disabled={!canReview}>
                Add Custom Order to Bag
              </Button>
            )}
          </div>
        </div>

        <div className="h-fit border border-line p-6">
          <div className="relative mb-4 aspect-[4/5] overflow-hidden bg-ivory-deep">
            <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
          </div>
          <p className="font-display text-lg">{product.name}</p>
          <p className="mt-1 text-sm text-ink/50">{product.category}</p>
          <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <Row label="Base Price" value={formatNaira(product.price)} />
            {fabricCost > 0 && <Row label="Fabric Upgrade" value={`+${formatNaira(fabricCost)}`} />}
            {styleCost > 0 && <Row label="Customizations" value={`+${formatNaira(styleCost)}`} />}
            <Row label="Quantity" value={String(draft.quantity)} />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <p className="font-medium">Estimated Total</p>
            <p className="font-display text-xl">{formatNaira(total)}</p>
          </div>
          <p className="mt-2 text-[11px] text-ink/40">Delivery, express fees, and any coupon are applied at checkout.</p>
        </div>
      </div>
    </div>
  );
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
}: {
  product: Product;
  draft: Draft;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  availableFabrics: { id: string; name: string; image: string; description: string; additionalCost: number; category: string }[];
  styleGroups: { groupId: string; required: boolean; group?: { id: string; name: string; description?: string; choices: { id: string; label: string; additionalCost: number; available: boolean }[] } }[];
  colorSwatches: { id: string; name: string; hex: string }[];
  hasSizingChoice: boolean;
}) {
  return (
    <div className="space-y-10">
      {availableFabrics.length > 0 && (
        <section>
          <p className="eyebrow mb-3">Fabric</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {availableFabrics.map((f) => (
              <button
                key={f.id}
                onClick={() => update("fabricId", f.id)}
                className={`border p-2.5 text-left ${draft.fabricId === f.id ? "border-brass bg-brass/5" : "border-line hover:border-ink"}`}
              >
                <div className="relative aspect-square overflow-hidden bg-ivory-deep">
                  <Image src={f.image} alt={f.name} fill className="object-cover" sizes="140px" unoptimized />
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
        <p className="eyebrow mb-3">Colour</p>
        <div className="grid gap-5 sm:grid-cols-3">
          <ColorField label="Primary" required value={draft.primaryColor} onChange={(v) => update("primaryColor", v)} swatches={colorSwatches} />
          <ColorField label="Secondary (optional)" value={draft.secondaryColor} onChange={(v) => update("secondaryColor", v)} swatches={colorSwatches} allowNone />
          <ColorField label="Contrast (optional)" value={draft.contrastColor} onChange={(v) => update("contrastColor", v)} swatches={colorSwatches} allowNone />
        </div>
      </section>

      {styleGroups.map(({ groupId, group, required }) =>
        group ? (
          <section key={groupId}>
            <p className="eyebrow mb-3">
              {group.name}
              {required && <span className="text-error"> *</span>}
            </p>
            {group.description && <p className="mb-3 text-xs text-ink/45">{group.description}</p>}
            <div className="flex flex-wrap gap-2">
              {group.choices.filter((c) => c.available).map((c) => (
                <button
                  key={c.id}
                  onClick={() => update("styleChoices", { ...draft.styleChoices, [groupId]: c.id })}
                  className={`border px-3.5 py-2 text-sm ${draft.styleChoices[groupId] === c.id ? "border-ink bg-ink text-ivory" : "border-line text-ink/70 hover:border-ink"}`}
                >
                  {c.label}
                  {c.additionalCost > 0 && <span className="ml-1.5 text-[11px] opacity-70">+{formatNaira(c.additionalCost)}</span>}
                </button>
              ))}
            </div>
          </section>
        ) : null
      )}

      <section>
        <p className="eyebrow mb-3">Size</p>
        {hasSizingChoice && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => update("sizingChoice", "standard")}
              className={`border p-4 text-left ${draft.sizingChoice === "standard" ? "border-brass bg-ivory-deep/40" : "border-line"}`}
            >
              <p className="text-sm font-medium">Standard Size</p>
              <p className="mt-1 text-xs text-ink/50">Choose from our standard size range.</p>
            </button>
            <button
              onClick={() => update("sizingChoice", "measure")}
              className={`border p-4 text-left ${draft.sizingChoice === "measure" ? "border-brass bg-ivory-deep/40" : "border-line"}`}
            >
              <p className="text-sm font-medium">Made-to-Measure</p>
              <p className="mt-1 text-xs text-ink/50">Provide your own measurements for a precise fit.</p>
            </button>
          </div>
        )}
        {(!hasSizingChoice ? product.sizingMode === "standard" : draft.sizingChoice === "standard") && (
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                onClick={() => update("size", s)}
                className={`border px-3.5 py-2 text-sm ${draft.size === s ? "border-ink bg-ink text-ivory" : "border-line text-ink/70 hover:border-ink"}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {((hasSizingChoice && draft.sizingChoice === "measure") || product.sizingMode === "made-to-measure") && (
          <p className="text-sm text-ink/60">You&rsquo;ll provide your measurements on the next step.</p>
        )}
      </section>

      <section>
        <p className="eyebrow mb-3">Quantity</p>
        <div className="flex w-fit items-center border border-line">
          <button onClick={() => update("quantity", Math.max(1, draft.quantity - 1))} className="px-3 py-2 text-ink/70 hover:text-ink">−</button>
          <span className="w-10 text-center text-sm">{draft.quantity}</span>
          <button onClick={() => update("quantity", draft.quantity + 1)} className="px-3 py-2 text-ink/70 hover:text-ink">+</button>
        </div>
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

function PreferencesStep({ draft, update }: { draft: Draft; update: <K extends keyof Draft>(key: K, value: Draft[K]) => void }) {
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
        toast("File too large", { description: `${file.name} exceeds the 1.8MB upload limit.`, variant: "error" });
        return false;
      }
      return true;
    });
    if (!selected.length) return;

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const form = new FormData();
        form.append("file", file);
        form.append("alt", `Customer reference: ${file.name}`);
        const asset = await apiRequest<{ url: string }>("/custom-order-references", { method: "POST", body: form });
        uploaded.push(apiAssetUrl(asset.url));
      }
      update("referenceImages", [...draft.referenceImages, ...uploaded]);
    } catch (error) {
      toast("Reference image upload failed", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <p className="eyebrow mb-1">Have something else in mind?</p>
        <p className="mb-4 text-sm text-ink/60">
          If what you want isn&rsquo;t covered by the options above, show us. Upload reference images of designs, fabrics,
          embroidery, colour combinations, necklines, sleeves, or anything else that inspired you.
        </p>
        <div
          onClick={() => fileInput.current?.click()}
          className="cursor-pointer border-2 border-dashed border-line p-6 text-center text-sm text-ink/40 hover:border-brass hover:text-brass"
        >
          {uploading ? "Uploading reference images…" : `Click to upload reference images (${draft.referenceImages.length}/${MAX_REFERENCE_IMAGES})`}
        </div>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden disabled={uploading} onChange={(e) => void handleFiles(e.target.files)} />

        {draft.referenceImages.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {draft.referenceImages.map((src, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden bg-ivory-deep">
                <Image src={src} alt={`Reference ${i + 1}`} fill className="object-cover" unoptimized />
                <button
                  onClick={() => update("referenceImages", draft.referenceImages.filter((_, x) => x !== i))}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/80 text-[10px] text-ivory opacity-0 transition-opacity group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {draft.referenceImages.length > 0 && (
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-xs text-ink/60">What should we take from this reference?</span>
            <textarea
              rows={2}
              value={draft.referenceNotes}
              onChange={(e) => update("referenceNotes", e.target.value)}
              placeholder="e.g. Just the sleeve style, or the embroidery pattern on the chest…"
              className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
            />
          </label>
        )}
      </section>

      <section>
        <p className="eyebrow mb-1">Tell us exactly how you&rsquo;d like it</p>
        <p className="mb-3 text-sm text-ink/60">Anything our tailors should know — think of this as writing directly to them.</p>
        <textarea
          rows={5}
          value={draft.specialInstructions}
          onChange={(e) => update("specialInstructions", e.target.value)}
          placeholder="Describe any additional details, preferences or changes you'd like us to consider…"
          className="w-full border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
        />
      </section>
    </div>
  );
}

/* ─────────────────────────────── Step 4: Review ─────────────────────────────── */

function ReviewStep({
  product,
  draft,
  fabric,
  styleGroups,
  needsMeasurements,
  customizationCost,
  total,
  onEditStep,
}: {
  product: Product;
  draft: Draft;
  fabric?: { name: string; additionalCost: number };
  styleGroups: { groupId: string; group?: { id: string; name: string; choices: { id: string; label: string; additionalCost: number }[] } }[];
  needsMeasurements: boolean;
  customizationCost: number;
  total: number;
  onEditStep: (key: string) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl">Review Your Custom Order</h2>

      <div className="border border-line p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Design</p>
          <button onClick={() => onEditStep("customize")} className="text-xs text-clay hover:text-brass">Edit</button>
        </div>
        <p className="text-sm">{product.name}</p>
        {fabric && <p className="mt-1 text-sm text-ink/60">Fabric: {fabric.name}{fabric.additionalCost > 0 ? ` (+${formatNaira(fabric.additionalCost)})` : ""}</p>}
        <p className="mt-1 text-sm text-ink/60">
          Colour: {draft.primaryColor ?? "—"}
          {draft.secondaryColor && `, ${draft.secondaryColor}`}
          {draft.contrastColor && `, ${draft.contrastColor}`}
        </p>
        {styleGroups.map(({ groupId, group }) => {
          const choiceId = draft.styleChoices[groupId];
          const choice = group?.choices.find((c) => c.id === choiceId);
          if (!choice) return null;
          return (
            <p key={groupId} className="mt-1 text-sm text-ink/60">
              {group?.name}: {choice.label}
              {choice.additionalCost > 0 ? ` (+${formatNaira(choice.additionalCost)})` : ""}
            </p>
          );
        })}
        <p className="mt-1 text-sm text-ink/60">{needsMeasurements ? "Made-to-Measure" : `Size: ${draft.size}`}</p>
        <p className="mt-1 text-sm text-ink/60">Quantity: {draft.quantity}</p>
      </div>

      <div className="border border-line p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Measurements</p>
          {needsMeasurements && <button onClick={() => onEditStep("measurements")} className="text-xs text-clay hover:text-brass">Edit</button>}
        </div>
        {!needsMeasurements ? (
          <p className="text-sm text-ink/60">Standard size — no measurements needed.</p>
        ) : draft.measurementMode === "profile" ? (
          <p className="text-sm text-ink/60">Using a saved measurement profile.</p>
        ) : Object.keys(draft.measurementValues).length === 0 ? (
          <p className="text-sm text-error">No measurements provided yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-xs text-ink/60">
            {Object.entries(draft.measurementValues).map(([k, v]) => (
              <span key={k}>{k}: {v}{draft.measurementUnit}</span>
            ))}
          </div>
        )}
      </div>

      <div className="border border-line p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Preferences</p>
          <button onClick={() => onEditStep("preferences")} className="text-xs text-clay hover:text-brass">Edit</button>
        </div>
        {draft.referenceImages.length > 0 ? (
          <>
            <div className="mb-2 flex gap-2">
              {draft.referenceImages.map((src, i) => (
                <div key={i} className="relative h-14 w-14 overflow-hidden bg-ivory-deep">
                  <Image src={src} alt="" fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
            {draft.referenceNotes && <p className="text-sm text-ink/60">Reference notes: {draft.referenceNotes}</p>}
          </>
        ) : (
          <p className="text-sm text-ink/40">No reference images uploaded.</p>
        )}
        <p className="mt-2 text-sm text-ink/60">{draft.specialInstructions || "No special instructions."}</p>
      </div>

      <div className="border border-line p-5">
        <p className="eyebrow mb-3">Price Breakdown</p>
        <Row label="Base Price" value={formatNaira(product.price)} />
        {customizationCost > 0 && <Row label="Customizations" value={`+${formatNaira(customizationCost)}`} />}
        <div className="mt-2 flex justify-between border-t border-line pt-2 text-sm font-medium">
          <span>Total ({draft.quantity} item{draft.quantity > 1 ? "s" : ""})</span>
          <span>{formatNaira(total)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-ink/50">{label}</span>
      <span className="text-ink/80">{value}</span>
    </div>
  );
}
