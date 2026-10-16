"use client";

// Measurements for one piece in the bag: reached from the bag, cart or
// checkout when a made-to-measure piece is waiting on them. Saving attaches
// them to that bag item and returns the customer to where they came from.

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { toast } from "@/lib/toast";
import { placeholderFor } from "@/lib/brand-images";
import MeasurementCapture from "@/components/measurement/MeasurementCapture";

// Only return to pages on this site.
const safeBack = (value: string | null) => (value && value.startsWith("/") && !value.startsWith("//") ? value : "/checkout");

function ItemMeasurements() {
  const { id } = useParams<{ id: string }>();
  const back = safeBack(useSearchParams().get("back"));
  const router = useRouter();
  const { items, isReady, setItemMeasurement } = useCart();
  const item = items.find((i) => i.id === decodeURIComponent(id));

  if (!isReady) return <div className="min-h-[60vh]" />;

  if (!item) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="display text-3xl">That piece is no longer in your bag.</h1>
        <Link href="/shop" className="label link-line mt-8 inline-block text-ink">
          Continue shopping
        </Link>
      </div>
    );
  }

  const { product } = item;

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:px-8 lg:pt-16">
      <Link href={back} className="label link-line text-ink/60 hover:text-ink">
        ← Back
      </Link>
      <p className="label mt-10 text-clay">Made to measure</p>
      <h1 className="display mt-3 text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[1.02]">Your measurements</h1>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/70">
        This piece is cut to your body, so we need your measurements before payment. Use a saved profile, enter numbers you already have,
        or let us guide you step by step. Your progress is saved as you go.
      </p>

      <div className="mt-10 flex items-center gap-4 border-y border-line py-5">
        <div className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden bg-bone">
          <Image src={product.images[0]} alt={product.name} fill sizes="72px" placeholder={placeholderFor(product.images[0])} className="object-cover" />
        </div>
        <div className="text-sm">
          <p className="display text-xl">{product.name}</p>
          <p className="mt-1 text-ink/60">
            {item.color}
            {item.size && item.size !== "Made-to-Measure" ? ` · base size ${item.size}` : ""} · qty {item.quantity}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <MeasurementCapture
          garment={product.garment}
          storageKey={`measure-draft-item-${item.id}`}
          fieldOverride={product.measurementFieldKeys}
          onSaved={(payload) => {
            setItemMeasurement(item.id, payload);
            toast("Measurements saved", { description: `${product.name} is ready for checkout.`, variant: "success" });
            router.push(back);
          }}
        />
      </div>
    </div>
  );
}

export default function ItemMeasurementsPage() {
  return (
    <Suspense>
      <ItemMeasurements />
    </Suspense>
  );
}
