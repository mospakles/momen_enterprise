"use client";

// Storefront UI state that several surfaces share: the slide-out bag, the
// full-screen search, and the bag icon's position (the target for the
// "fly to bag" animation when something is added).

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

interface Flight {
  id: number;
  src: string;
  from: DOMRect;
  to: DOMRect;
}

interface UIContextValue {
  bagOpen: boolean;
  openBag: () => void;
  closeBag: () => void;
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  bagIconRef: React.RefObject<HTMLButtonElement | null>;
  /** Animate a product image from `from` into the bag icon. */
  flyToBag: (src: string, from: DOMRect | null | undefined) => void;
  flights: Flight[];
  endFlight: (id: number) => void;
  /** Whether the header has slid away (scrolling down); sticky toolbars use
   * this to close the gap it leaves. */
  headerHidden: boolean;
  setHeaderHidden: (hidden: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [bagOpen, setBagOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [headerHidden, setHeaderHidden] = useState(false);
  const bagIconRef = useRef<HTMLButtonElement | null>(null);
  const counter = useRef(0);

  const flyToBag = useCallback((src: string, from: DOMRect | null | undefined) => {
    const to = bagIconRef.current?.getBoundingClientRect();
    if (!from || !src || !to) return;
    counter.current += 1;
    const id = counter.current;
    setFlights((prev) => [...prev, { id, src, from, to }]);
  }, []);
  const endFlight = useCallback((id: number) => setFlights((prev) => prev.filter((f) => f.id !== id)), []);

  const value = useMemo<UIContextValue>(
    () => ({
      bagOpen,
      openBag: () => {
        setSearchOpen(false);
        setBagOpen(true);
      },
      closeBag: () => setBagOpen(false),
      searchOpen,
      openSearch: () => {
        setBagOpen(false);
        setSearchOpen(true);
      },
      closeSearch: () => setSearchOpen(false),
      bagIconRef,
      flyToBag,
      flights,
      endFlight,
      headerHidden,
      setHeaderHidden,
    }),
    [bagOpen, searchOpen, flyToBag, flights, endFlight, headerHidden],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
