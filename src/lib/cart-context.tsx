"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CartItem, CartMeasurement, Product } from "./types";
import { apiRequest } from "./api";
import { useCustomerAuth } from "./customer-auth-context";
import { toast } from "./toast";
import { availableUnits, effectivePrice, isMadeToMeasure, stockState } from "./product-utils";
import { withCurrentItemImages } from "./brand-images";

interface CartContextValue {
  items: CartItem[];
  wishlist: string[];
  /** `fit: "measure"` marks the piece as needing measurements before checkout. */
  /** Adds (or merges into an identical line, capped by stock) and returns
   * the line id ("" when nothing could be added). `silent` skips opening the
   * bag drawer (e.g. "Buy now", which goes straight to checkout). */
  addItem: (product: Product, size: string, color: string, quantity?: number, fit?: "standard" | "measure", options?: { silent?: boolean }) => string;
  /** Used by the Made-to-Measure wizard to add a fully custom-configured
   * item (fabric, colours, style customizations, measurements, reference
   * images, special instructions, and computed customization cost) in one
   * call rather than building it up via `addItem` + several setters. */
  addCustomItem: (item: Omit<CartItem, "id">) => string;
  removeItem: (id: string) => void;
  /** Re-insert a removed line at its old position (bag "Undo"). */
  restoreItem: (item: CartItem, index: number) => void;
  /** Change a line's size or colour in place (bag inline edit). */
  updateItem: (id: string, patch: Partial<Pick<CartItem, "size" | "color">>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setItemMeasurement: (id: string, measurement: CartMeasurement) => void;
  /** Empties the bag. For signed-in customers the empty bag is saved to the
   * server straight away (no debounce) — await it before navigating away. */
  clearCart: () => Promise<void>;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  subtotal: number;
  count: number;
  isReady: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Cap for pieces made per order (made-to-measure / made-to-order). */
export const MADE_TO_ORDER_MAX_QTY = 10;
/** Most of one piece in a single order (the API refuses more). */
export const MAX_LINE_QTY = 10;

/** Pieces cut per order (made-to-measure, made-to-order, or untracked
 * stock) — their quantity isn't limited by inventory. */
export function isMadePerOrder(product: Product) {
  return isMadeToMeasure(product) || stockState(product) === "made-to-order" || !(product.stockQuantity > 0);
}

/** Most units of a product/size a customer can have in the bag: per-size
 * stock (or overall available units) for stocked ready-to-wear, otherwise a
 * sane cap for pieces that are made per order. */
export function maxQuantityFor(product: Product, size: string) {
  if (isMadePerOrder(product)) return MADE_TO_ORDER_MAX_QTY;
  const perSize = product.sizeStock?.[size];
  return Math.max(0, Math.min(MAX_LINE_QTY, perSize ?? availableUnits(product)));
}

/** Whether a size is sold out (tracked per size with zero units left). */
export function isSizeSoldOut(product: Product, size: string) {
  return product.sizeStock?.[size] === 0;
}

/** Two plain lines that describe the same piece and can share a quantity. */
function sameMergeableLine(a: Pick<CartItem, "product" | "size" | "color" | "fit" | "measurement" | "customOrder">, b: typeof a) {
  const unmeasured = (i: typeof a) => !i.measurement || i.measurement.mode === "pending";
  return (
    !a.customOrder &&
    !b.customOrder &&
    a.product.id === b.product.id &&
    a.size === b.size &&
    a.color === b.color &&
    (a.fit ?? "standard") === (b.fit ?? "standard") &&
    unmeasured(a) &&
    unmeasured(b) &&
    (a.measurement?.mode ?? null) === (b.measurement?.mode ?? null)
  );
}

/** Fired after a line is added; the bag drawer listens and slides open
 * (no redirect to the cart page). Deferred so the line exists by then. */
export const CART_ADDED_EVENT = "momen:cart-added";
/** Saves references only; the server re-reads products and prices. */
function saveRemoteCart(items: CartItem[]) {
  return apiRequest("/cart", {
    method: "PUT",
    body: {
      items: items.map((i) => ({
        id: i.id,
        productId: i.product.id,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        measurement: i.measurement,
        fit: i.fit,
        customizations: i.customizations,
        customOrder: i.customOrder,
      })),
    },
  });
}

export type CartAddedDetail = { id: string; silent?: boolean };

function announceAdded(id: string, silent = false) {
  if (typeof window === "undefined") return;
  window.setTimeout(() => window.dispatchEvent(new CustomEvent<CartAddedDetail>(CART_ADDED_EVENT, { detail: { id, silent } })), 0);
}
const CART_KEY = "momen.cart.v1";
const WISHLIST_KEY = "momen.wishlist.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useCustomerAuth();
  const [items, setItemsState] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  // Mirrors `items` synchronously so mutations can return ids (e.g. the id of
  // a merged line) and chained calls (addItem → setItemMeasurement) see the
  // latest bag within the same event.
  const itemsRef = useRef<CartItem[]>([]);
  const setItems = useCallback((next: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    const value = typeof next === "function" ? next(itemsRef.current) : next;
    itemsRef.current = value;
    setItemsState(value);
  }, []);

  useEffect(() => {
    try {
      const rawCart = localStorage.getItem(CART_KEY);
      const rawWish = localStorage.getItem(WISHLIST_KEY);
      if (rawCart) setItems(withCurrentItemImages(JSON.parse(rawCart)));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating the wishlist from localStorage on mount
      if (rawWish) setWishlist(JSON.parse(rawWish));
    } catch {
      // ignore corrupt storage
    } finally {
      setIsReady(true);
    }
  }, [setItems]);

  useEffect(() => {
    if (isReady) localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, isReady]);

  useEffect(() => {
    if (isReady) localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist, isReady]);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    void apiRequest<Array<{ productId: string }>>("/wishlist")
      .then(async (rows) => {
        if (!active) return;
        const remote = rows.map((row) => row.productId);
        let local: string[] = [];
        try {
          local = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]") as string[];
        } catch {
          local = [];
        }
        const missing = local.filter((id) => !remote.includes(id));
        await Promise.allSettled(missing.map((id) => apiRequest(`/wishlist/${encodeURIComponent(id)}`, { method: "POST" })));
        if (active) setWishlist([...new Set([...remote, ...local])]);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [currentUser]);

  // Signed-in bags live on the server too, so they follow the customer
  // across devices. On sign-in the saved bag and this device's bag are
  // merged (no duplicate lines); after that, changes are saved back. Prices
  // and product data always come from the server's re-hydrated copy.
  const [serverSynced, setServerSynced] = useState<string | null>(null);
  useEffect(() => {
    if (!isReady || !currentUser || serverSynced === currentUser.id) return;
    let active = true;
    void apiRequest<{ items: CartItem[] }>("/cart")
      .then(async (remote) => {
        if (!active) return;
        const sameLine = (a: CartItem, b: CartItem) => a.id === b.id || sameMergeableLine(a, b);
        let local: CartItem[] = [];
        try {
          local = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as CartItem[];
        } catch {
          local = [];
        }
        const merged = [...remote.items, ...local.filter((l) => !remote.items.some((r) => sameLine(r, l)))];
        setItems(withCurrentItemImages(merged));
        setServerSynced(currentUser.id);
        if (merged.length !== remote.items.length) await saveRemoteCart(merged);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isReady, currentUser, serverSynced, setItems]);

  useEffect(() => {
    if (!currentUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset sync marker on sign-out
      setServerSynced(null);
      return;
    }
    if (serverSynced !== currentUser.id) return;
    const id = window.setTimeout(() => void saveRemoteCart(items).catch(() => undefined), 600);
    return () => window.clearTimeout(id);
  }, [items, currentUser, serverSynced]);

  const addItem = useCallback((product: Product, size: string, color: string, quantity = 1, fit: "standard" | "measure" = "standard", options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    const mtm = isMadeToMeasure(product);
    const measured = mtm && fit === "measure";
    const candidate: Omit<CartItem, "id"> = {
      product,
      size,
      color,
      quantity,
      fit: mtm ? fit : "standard",
      measurement: measured ? { mode: "pending", unit: "cm" } : undefined,
    };
    const max = maxQuantityFor(product, size);
    const prev = itemsRef.current;
    const existing = prev.find((i) => sameMergeableLine(i, candidate));
    const already = existing?.quantity ?? 0;
    if (already >= max) {
      toast(max === 0 ? "This size is sold out" : `Only ${max} available`, {
        description: max === 0 ? undefined : "You already have every available piece in your bag.",
      });
      return existing?.id ?? "";
    }
    const nextQty = Math.min(max, already + Math.max(1, quantity));
    if (nextQty < already + Math.max(1, quantity)) toast(`Only ${max} available`, { description: `Your bag now holds ${nextQty}.` });
    let id: string;
    if (existing) {
      id = existing.id;
      setItems(prev.map((i) => (i.id === id ? { ...i, product, quantity: nextQty } : i)));
    } else {
      id = `${product.id}-${size}-${color}-${Date.now()}`;
      setItems([...prev, { ...candidate, id, quantity: nextQty }]);
    }
    announceAdded(id, silent);
    return id;
  }, [setItems]);

  const addCustomItem = useCallback((item: Omit<CartItem, "id">) => {
    const id = `${item.product.id}-custom-${Date.now()}`;
    setItems((prev) => [...prev, { ...item, id }]);
    announceAdded(id);
    return id;
  }, [setItems]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, [setItems]);

  const restoreItem = useCallback((item: CartItem, index: number) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, item);
      return next;
    });
  }, [setItems]);

  const updateItem = useCallback((id: string, patch: Partial<Pick<CartItem, "size" | "color">>) => {
    setItems((prev) => {
      const current = prev.find((i) => i.id === id);
      if (!current) return prev;
      const updated = { ...current, ...patch };
      // Changing size/colour can make this line identical to another one:
      // fold that line's quantity into this one (kept, as it's being edited).
      const twin = prev.find((i) => i.id !== id && sameMergeableLine(i, updated));
      const max = maxQuantityFor(updated.product, updated.size);
      const wanted = updated.quantity + (twin?.quantity ?? 0);
      updated.quantity = Math.max(1, Math.min(max, wanted));
      if (wanted > updated.quantity) toast(`Only ${max} available in ${updated.size}`);
      return prev.filter((i) => i.id !== twin?.id).map((i) => (i.id === id ? updated : i));
    });
  }, [setItems]);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const max = i.customOrder ? MADE_TO_ORDER_MAX_QTY : maxQuantityFor(i.product, i.size);
        return { ...i, quantity: Math.max(1, Math.min(Math.max(1, max), quantity)) };
      }),
    );
  }, [setItems]);

  const setItemMeasurement = useCallback((id: string, measurement: CartMeasurement) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, measurement, fit: isMadeToMeasure(i.product) ? "measure" : i.fit } : i)));
  }, [setItems]);

  const clearCart = useCallback(async () => {
    setItems([]);
    try {
      localStorage.setItem(CART_KEY, "[]");
    } catch {
      // storage unavailable — the state is still cleared
    }
    // Skip the debounce: the caller is usually about to navigate away, and a
    // stale server bag would be merged back on the next load.
    if (currentUser) await saveRemoteCart([]).then(() => undefined, () => undefined);
  }, [currentUser, setItems]);

  const toggleWishlist = useCallback((productId: string) => {
    const removing = wishlist.includes(productId);
    setWishlist((previous) => removing ? previous.filter((id) => id !== productId) : [...previous, productId]);
    if (currentUser) {
      void apiRequest(`/wishlist/${encodeURIComponent(productId)}`, {
        method: removing ? "DELETE" : "POST",
      }).catch((error) => {
        setWishlist((current) =>
          removing ? [...new Set([...current, productId])] : current.filter((id) => id !== productId),
        );
        toast("Wishlist update failed", {
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "error",
        });
      });
    }
  }, [currentUser, wishlist]);

  const isWishlisted = useCallback((productId: string) => wishlist.includes(productId), [wishlist]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (effectivePrice(item.product) + (item.customizationCost ?? 0)) * item.quantity, 0),
    [items]
  );
  const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const value: CartContextValue = {
    items,
    wishlist,
    addItem,
    addCustomItem,
    removeItem,
    restoreItem,
    updateItem,
    updateQuantity,
    setItemMeasurement,
    clearCart,
    toggleWishlist,
    isWishlisted,
    subtotal,
    count,
    isReady,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
