"use client";

// Approved reviews from the API, with photos, a rating breakdown and a form
// to write one (moderated by the admin before it appears).

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { apiAssetUrl, apiRequest } from "@/lib/api";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { formatDate } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";

interface Review {
  id: string;
  customerName: string;
  rating: number;
  title?: string | null;
  body: string;
  images: string[];
  responseMessage?: string | null;
  fit?: Fit | null;
  createdAt: string;
}

type Fit = "runs_small" | "true_to_size" | "runs_large";
const FIT_LABEL: Record<Fit, string> = { runs_small: "Runs small", true_to_size: "True to size", runs_large: "Runs large" };

export default function Reviews({ productId, productName }: { productId: string; productName: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [writing, setWriting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiRequest<Review[]>(`/reviews?productId=${encodeURIComponent(productId)}`)
      .then((rows) => active && setReviews(rows))
      .catch(() => active && setReviews([]));
    return () => {
      active = false;
    };
  }, [productId]);

  const count = reviews?.length ?? 0;
  const average = count ? reviews!.reduce((s, r) => s + r.rating, 0) / count : 0;
  const photos = (reviews ?? []).flatMap((r) => r.images.map((src) => apiAssetUrl(src))).slice(0, 8);

  return (
    <section aria-labelledby="reviews-heading" className="border-t border-line pt-16">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="label text-clay">Reviews</p>
          <h2 id="reviews-heading" className="display mt-3 text-4xl">
            {count ? "What they say" : "Be the first to review"}
          </h2>
          {count > 0 && (
            <p className="mt-3 flex items-center gap-3 text-sm text-ink/70">
              <Stars value={average} /> {average.toFixed(1)} · {count} {count === 1 ? "review" : "reviews"}
            </p>
          )}
        </div>
        <button type="button" onClick={() => setWriting(true)} className="self-start border border-ink px-6 py-3 text-sm tracking-wide transition-colors hover:bg-ink hover:text-ivory lg:self-auto">
          Write a review
        </button>
      </div>

      {reviews === null ? (
        <div className="mt-10 grid gap-6 md:grid-cols-2" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3 border-t border-line pt-6">
              <span className="shimmer block h-4 w-24" />
              <span className="shimmer block h-5 w-2/3" />
              <span className="shimmer block h-16 w-full" />
            </div>
          ))}
        </div>
      ) : count === 0 ? (
        <p className="mt-6 max-w-md text-sm text-ink/65">Worn {productName}? Tell others how it fits and feels — your words help the next man choose well.</p>
      ) : (
        <>
          <FitSummary reviews={reviews!} />
          {photos.length > 0 && (
            <ul className="no-scrollbar mt-10 flex gap-3 overflow-x-auto">
              {photos.map((src) => (
                <li key={src} className="shrink-0">
                  <button type="button" onClick={() => setPhoto(src)} className="relative block h-28 w-24 overflow-hidden bg-bone" aria-label="Open customer photo">
                    <Image src={src} alt="Customer photo" fill sizes="96px" className="object-cover" unoptimized />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ul className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {reviews!.slice(0, 6).map((r) => (
              <li key={r.id} className="border-t border-line pt-6">
                <div className="flex items-center justify-between">
                  <Stars value={r.rating} />
                  <span className="text-xs text-ink/45">{formatDate(r.createdAt)}</span>
                </div>
                {r.title && <p className="mt-3 font-medium">{r.title}</p>}
                {r.fit && <p className="label mt-2 text-[0.6rem] text-ink/50">Fit: {FIT_LABEL[r.fit]}</p>}
                <p className="mt-2 text-sm leading-relaxed text-ink/75">{r.body}</p>
                <p className="label mt-4 text-ink/50">{r.customerName}</p>
                {r.responseMessage && (
                  <p className="mt-4 border-l-2 border-terracotta pl-4 text-sm text-ink/70">
                    <span className="label mb-1 block text-terracotta">momen. replied</span>
                    {r.responseMessage}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal open={Boolean(photo)} onClose={() => setPhoto(null)} title="Customer photo">
        {photo && (
          <div className="relative aspect-[4/5] w-full bg-bone">
            <Image src={photo} alt="Customer photo" fill sizes="600px" className="object-contain" unoptimized />
          </div>
        )}
      </Modal>
      <WriteReview open={writing} onClose={() => setWriting(false)} productId={productId} productName={productName} />
    </section>
  );
}

function WriteReview({ open, onClose, productId, productName }: { open: boolean; onClose: () => void; productId: string; productName: string }) {
  const { currentUser } = useCustomerAuth();
  const [rating, setRating] = useState(0);
  const [fit, setFit] = useState<Fit | null>(null);
  const [form, setForm] = useState({ name: "", email: "", title: "", body: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const name = form.name || currentUser?.name || "";
  const email = form.email || currentUser?.email || "";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!rating) return setError("Choose a star rating.");
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email)) return setError("Add your name and a valid email.");
    if (form.body.trim().length < 10) return setError("Tell us a little more — at least a sentence.");
    setError(null);
    setState("sending");
    try {
      await apiRequest("/reviews", {
        method: "POST",
        body: { productId, customerName: name.trim(), customerEmail: email.trim(), rating, title: form.title.trim() || undefined, body: form.body.trim(), fit: fit ?? undefined },
      });
      setState("sent");
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "We couldn't send that. Please try again.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Review ${productName}`}>
      {state === "sent" ? (
        <div className="px-6 py-10">
          <p className="display text-3xl">Thank you.</p>
          <p className="mt-3 text-sm text-ink/70">Your review is with us and will appear once it&rsquo;s been read by the house.</p>
          <button type="button" onClick={onClose} className="mt-8 bg-ink px-6 py-3 text-sm text-ivory">Close</button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5 px-6 py-6">
          <fieldset>
            <legend className="label mb-2 text-ink/60">Your rating</legend>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setRating(n)}
                  className={`text-3xl leading-none transition-colors ${n <= rating ? "text-terracotta" : "text-ink/20 hover:text-ink/40"}`}
                >
                  ★
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label mb-2 text-ink/60">How does it fit? (optional)</legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup">
              {(Object.keys(FIT_LABEL) as Fit[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={fit === f}
                  onClick={() => setFit(fit === f ? null : f)}
                  className={`border px-2 py-2.5 text-sm transition-colors ${fit === f ? "border-ink bg-ink text-ivory" : "border-line hover:border-ink"}`}
                >
                  {FIT_LABEL[f]}
                </button>
              ))}
            </div>
          </fieldset>
          {!currentUser && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} autoComplete="name" />
              <TextField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} autoComplete="email" inputMode="email" />
            </div>
          )}
          <TextField label="Headline (optional)" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <label className="block">
            <span className="label text-ink/60">Your review</span>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={5}
              placeholder="Fit, feel, the occasion you wore it to…"
              className="mt-1 w-full resize-none border border-line bg-transparent p-3 text-sm outline-none focus:border-ink"
            />
          </label>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          <button type="submit" disabled={state === "sending"} className="w-full bg-ink px-6 py-4 text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta disabled:opacity-50">
            {state === "sending" ? "Sending…" : "Submit review"}
          </button>
        </form>
      )}
    </Modal>
  );
}

/** "Runs small · True to size · Runs large" bar from reviewers' fit notes. */
function FitSummary({ reviews }: { reviews: Review[] }) {
  const rated = reviews.filter((r) => r.fit);
  if (rated.length === 0) return null;
  // Position: 0 = small, 0.5 = true, 1 = large.
  const score = rated.reduce((s, r) => s + (r.fit === "runs_small" ? 0 : r.fit === "runs_large" ? 1 : 0.5), 0) / rated.length;
  const verdict = score < 0.35 ? "Runs small — consider a size up" : score > 0.65 ? "Runs large — consider a size down" : "True to size";
  return (
    <div className="mt-10 max-w-md">
      <p className="text-sm">
        <span className="font-medium">{verdict}</span> <span className="text-ink/50">· from {rated.length} {rated.length === 1 ? "review" : "reviews"}</span>
      </p>
      <div className="relative mt-3 h-0.5 bg-line" role="img" aria-label={`Fit: ${verdict}`}>
        <span className="absolute -top-1.25 h-3 w-3 -translate-x-1/2 rounded-full bg-ink" style={{ left: `${score * 100}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink/50" aria-hidden>
        <span>Runs small</span>
        <span>True to size</span>
        <span>Runs large</span>
      </div>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex text-sm tracking-[0.15em]" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden className={n <= Math.round(value) ? "text-terracotta" : "text-ink/15"}>
          ★
        </span>
      ))}
    </span>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block">
      <span className="label text-ink/60">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border-b border-line bg-transparent py-2 outline-none focus:border-ink"
      />
    </label>
  );
}
