"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-32 text-center">
      <p className="label text-clay">Something went wrong</p>
      <h1 className="display mt-4 text-[clamp(2.2rem,5vw,3.2rem)]">This page didn&rsquo;t load properly.</h1>
      <p className="mt-4 text-ink/65">Your bag is safe. Try again, or contact us if it keeps happening.</p>
      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" onClick={() => retry()} className="bg-ink px-6 py-3 text-sm text-ivory transition-colors hover:bg-terracotta">
          Try again
        </button>
        <Link href="/contact" className="border border-line px-6 py-3 text-sm hover:border-ink">
          Contact us
        </Link>
      </div>
      {error.digest && <p className="mt-8 text-xs text-ink/40">Reference: {error.digest}</p>}
    </div>
  );
}
