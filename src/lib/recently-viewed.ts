"use client";

import { useEffect, useState } from "react";

const KEY = "momen.recently-viewed";
const MAX = 12;

/** Records `slug` as viewed and returns the previously viewed slugs (most
 * recent first, excluding the current one). */
export function useRecentlyViewed(slug: string) {
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => {
    let previous: string[] = [];
    try {
      previous = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
    } catch {
      previous = [];
    }
    const next = [slug, ...previous.filter((s) => s !== slug)].slice(0, MAX);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser history of views on mount
    setSlugs(previous.filter((s) => s !== slug));
  }, [slug]);
  return slugs;
}
