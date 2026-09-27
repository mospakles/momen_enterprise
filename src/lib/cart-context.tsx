"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { CartItem, CartMeasurement, Product } from "./types";
import { toast } from "./toast";

interface CartContextValue {
  items: CartItem[];
  wishlist: string[];
  addItem: (product: Product, size: string, color: string, quantity?: number) => string;
  /** Used by the Made-to-Measure wizard to add a fully custom-configured
   * item (fabric, colours, style customizations, measurements, reference
   * images, special instructions, and computed customization cost) in one
   * call rather than building it up via `addItem` + several setters. */
  addCustomItem: (item: Omit<CartItem, "id">) => string;
  removeItem: (id: string) => void;
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
const CART_KEY = "momen.cart.v1";
const WISHLIST_KEY = "momen.wishlist.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const rawCart = localStorage.getItem(CART_KEY);
      const rawWish = localStorage.getItem(WISHLIST_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating cart from localStorage on mount
      if (rawCart) setItems(JSON.parse(rawCart));
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

  const addItem = useCallback((product: Product, size: string, color: string, quantity = 1) => {
    const id = `${product.id}-${size}-${color}-${Date.now()}`;
    setItems((prev) => [
      ...prev,
      {
        id,
        product,
        size,
        color,
        quantity,
        measurement:
          product.productionType === "made-to-measure"
            ? { mode: "pending", unit: "cm" }
            : undefined,
      },
    ]);
    toast(`Added to bag`, { description: product.name, variant: "success" });
    return id;
  }, []);

  const addCustomItem = useCallback((item: Omit<CartItem, "id">) => {
    const id = `${item.product.id}-custom-${Date.now()}`;
    setItems((prev) => [...prev, { ...item, id }]);
    toast("Custom order added to bag", { description: item.product.name, variant: "success" });
    return id;
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)));
  }, []);

  const setItemMeasurement = useCallback((id: string, measurement: CartMeasurement) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, measurement } : i)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((p) => p !== productId) : [...prev, productId]
    );
  }, []);

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
