// Small, dependency-free product search with typo tolerance. The catalogue is
// already in memory (AdminStoreProvider), so results are instant. Each query
// token must match some word of the product: exactly, by prefix, or within a
// small edit distance ("agbda" → agbada, "kaftn" → kaftan).

import type { Product } from "./types";

const SYNONYMS: Record<string, string[]> = {
  kaftan: ["caftan", "kaftans"],
  agbada: ["grand", "boubou"],
  trouser: ["pants", "trousers"],
  pants: ["trouser", "trousers"],
  shoes: ["footwear", "sandals", "pam"],
  hat: ["cap", "fila"],
  cap: ["fila", "hat"],
};

export function normalise(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .trim();
}

/** Damerau–Levenshtein distance with an early exit above `max`. */
export function editDistance(a: string, b: string, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

function tolerance(token: string) {
  return token.length >= 7 ? 2 : token.length >= 4 ? 1 : 0;
}

/** Score one token against a bag of words: 0 = no match. */
function tokenScore(token: string, words: string[]) {
  let best = 0;
  for (const word of words) {
    if (word === token) return 10;
    if (word.startsWith(token)) best = Math.max(best, 7);
    else if (token.length >= 3 && word.includes(token)) best = Math.max(best, 4);
    else {
      const tol = tolerance(token);
      // Compare with the whole word and with a same-length prefix, so a
      // half-typed misspelling ("kaftn") still finds "kaftans".
      if (tol && (editDistance(token, word, tol) <= tol || editDistance(token, word.slice(0, token.length + 1), tol) <= tol)) {
        best = Math.max(best, 5);
      }
    }
  }
  return best;
}

export function productWords(p: Product) {
  const text = [p.name, p.category, p.fabric, p.shortDescription ?? "", p.tags.join(" "), p.collectionSlugs.join(" "), p.colors.map((c) => c.name).join(" "), p.productType]
    .join(" ");
  return [...new Set(normalise(text).split(/\s+/).filter(Boolean))];
}

export function searchProducts(products: Product[], query: string) {
  const tokens = normalise(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const results: { product: Product; score: number }[] = [];
  for (const product of products) {
    if (product.publishStatus !== "published") continue;
    const words = productWords(product);
    const nameWords = normalise(product.name).split(/\s+/);
    let total = 0;
    let ok = true;
    for (const token of tokens) {
      const variants = [token, ...(SYNONYMS[token] ?? [])];
      const score = Math.max(...variants.map((v) => tokenScore(v, words)));
      if (!score) {
        ok = false;
        break;
      }
      total += score + (tokenScore(token, nameWords) ? 3 : 0);
    }
    if (ok) results.push({ product, score: total + (product.isFeatured ? 1 : 0) });
  }
  return results.sort((a, b) => b.score - a.score).map((r) => r.product);
}

/** Closest known catalogue word to a query that found nothing ("Did you mean"). */
export function suggestCorrection(products: Product[], query: string) {
  const token = normalise(query).split(/\s+/)[0];
  if (!token || token.length < 3) return null;
  const vocab = new Set<string>();
  products.forEach((p) => productWords(p).forEach((w) => w.length > 3 && vocab.add(w)));
  let best: { word: string; d: number } | null = null;
  for (const word of vocab) {
    const d = editDistance(token, word, 3);
    if (d <= 3 && (!best || d < best.d)) best = { word, d };
  }
  return best?.word ?? null;
}
