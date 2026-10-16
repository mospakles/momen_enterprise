"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { CartItem, CartMeasurement, Product } from "./types";
import { apiRequest } from "./api";
import { useCustomerAuth } from "./customer-auth-context";
import { toast } from "./toast";
import { isMadeToMeasure } from "./product-utils";
import { withCurrentItemImages } from "./brand-images";

interface CartContextValue {
  items: CartItem[];
  wishlist: string[];
  /** `fit: "measure"` marks the piece as needing measurements before checkout. */
  addItem: (product: Product, size: string, color: string, quantity?: number, fit?: "standard" | "measure") => string;
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
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  subtotal: number;
  count: number;
  isReady: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

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

function announceAdded(id: string) {
  if (typeof window === "undefined") return;
  window.setTimeout(() => window.dispatchEvent(new CustomEvent(CART_ADDED_EVENT, { detail: { id } })), 0);
}
const CART_KEY = "momen.cart.v1";
const WISHLIST_KEY = "momen.wishlist.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useCustomerAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const rawCart = localStorage.getItem(CART_KEY);
      const rawWish = localStorage.getItem(WISHLIST_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating cart from localStorage on mount
      if (rawCart) setItems(withCurrentItemImages(JSON.parse(rawCart)));
      if (rawWish) setWishlist(JSON.parse(rawWish));
    } catch {
      // ignore corrupt storage
    } finally {
      setIsReady(true);
    }
  }, []);

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
        const sameLine = (a: CartItem, b: CartItem) =>
          a.id === b.id ||
          (!a.customOrder && !b.customOrder && a.product.id === b.product.id && a.size === b.size && a.color === b.color);
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
  }, [isReady, currentUser, serverSynced]);

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

  const addItem = useCallback((product: Product, size: string, color: string, quantity = 1, fit: "standard" | "measure" = "standard") => {
    const id = `${product.id}-${size}-${color}-${Date.now()}`;
    const mtm = isMadeToMeasure(product);
    const measured = mtm && fit === "measure";
    setItems((prev) => [
      ...prev,
      {
        id,
        product,
        size,
        color,
        quantity,
        fit: mtm ? fit : undefined,
        measurement: measured ? { mode: "pending", unit: "cm" } : undefined,
      },
    ]);
    announceAdded(id);
    return id;
  }, []);

  const addCustomItem = useCallback((item: Omit<CartItem, "id">) => {
    const id = `${item.product.id}-custom-${Date.now()}`;
    setItems((prev) => [...prev, { ...item, id }]);
    announceAdded(id);
    return id;
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const restoreItem = useCallback((item: CartItem, index: number) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, item);
      return next;
    });
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<Pick<CartItem, "size" | "color">>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)));
  }, []);

  const setItemMeasurement = useCallback((id: string, measurement: CartMeasurement) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, measurement, fit: isMadeToMeasure(i.product) ? "measure" : i.fit } : i)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

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
    () => items.reduce((sum, item) => sum + (item.product.price + (item.customizationCost ?? 0)) * item.quantity, 0),
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
