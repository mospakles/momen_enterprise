import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-32 text-center">
      <p className="label text-clay">Page not found</p>
      <h1 className="display mt-4 text-[clamp(2.4rem,6vw,3.6rem)]">We couldn&rsquo;t find that page.</h1>
      <p className="mt-4 text-ink/65">The link may be old, or the page may have moved.</p>
      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/shop" className="bg-ink px-6 py-3 text-sm text-ivory transition-colors hover:bg-terracotta">
          Shop Ready-to-Wear
        </Link>
        <Link href="/made-to-measure" className="border border-line px-6 py-3 text-sm hover:border-ink">
          Start a bespoke order
        </Link>
      </div>
    </div>
  );
}
