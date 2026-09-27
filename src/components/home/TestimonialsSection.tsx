"use client";

import { useAdminStore } from "@/lib/admin/store";

export default function TestimonialsSection({ headline }: { headline?: string }) {
  const { testimonials } = useAdminStore();
  const featured = [...testimonials].filter((t) => t.featured).sort((a, b) => a.sortOrder - b.sortOrder);
  if (featured.length === 0) return null;

  return (
    <section className="bg-ivory-deep/50 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="eyebrow text-center">Testimonials</p>
        <h2 className="mt-2 text-center font-display text-3xl sm:text-4xl">{headline || "In Their Words"}</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {featured.slice(0, 3).map((t) => (
            <div key={t.id} className="border border-line bg-ivory p-6">
              {t.rating && <p className="text-brass">{"★".repeat(t.rating)}</p>}
              <p className="mt-3 text-sm italic leading-relaxed text-ink/75">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-4 eyebrow text-clay">{t.author}{t.role ? ` — ${t.role}` : ""}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
