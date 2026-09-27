"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { CustomizationApprovalStatus, Order, OrderNote, OrderStage, OrderStatus } from "./types";
import { generateSeedOrders, ORDER_STAGES } from "./admin/seed-orders";
import { useAdminStore } from "./admin/store";
import { toast } from "./toast";

export { ORDER_STAGES };

function genId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

interface OrdersContextValue {
  orders: Order[];
  addOrder: (order: Order) => void;
  advanceOrder: (id: string) => void;
  getOrder: (id: string) => Order | undefined;
  isReady: boolean;
  // Admin operations — same store, same persistence, so the storefront and
  // admin dashboard are always looking at one order.
  updateOrderStatus: (id: string, status: OrderStatus, actor: string) => void;
  addInternalNote: (id: string, author: string, message: string) => void;
  addCustomerNote: (id: string, author: string, message: string) => void;
  cancelOrder: (id: string, reason: string, actor: string) => void;
  duplicateOrder: (id: string) => string | undefined;
  assignProduction: (id: string, staffId: string) => void;
  updateProductionInfo: (id: string, patch: Partial<NonNullable<Order["production"]>>) => void;
  setPaymentStatus: (id: string, status: Order["paymentStatus"]) => void;
  updateCustomizationStatus: (id: string, status: CustomizationApprovalStatus, actor: string, note?: string) => void;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);
const KEY = "momen.orders.v1";

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isReady, setIsReady] = useState(false);
  const { logNotification } = useAdminStore();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating orders from localStorage on mount
      if (raw) setOrders(JSON.parse(raw));
      else setOrders(generateSeedOrders());
    } catch {
      setOrders(generateSeedOrders());
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady) localStorage.setItem(KEY, JSON.stringify(orders));
  }, [orders, isReady]);

  const addOrder = useCallback((order: Order) => {
    setOrders((prev) => [order, ...prev]);
  }, []);

  const advanceOrder = useCallback((id: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const idx = o.timeline.findIndex((t) => !t.complete);
        if (idx === -1) return o;
        const timeline = o.timeline.map((t, i) => (i === idx ? { ...t, complete: true, date: new Date().toISOString() } : t));
        return { ...o, timeline, status: timeline[idx].stage };
      })
    );
  }, []);

  const getOrder = useCallback((id: string) => orders.find((o) => o.id === id), [orders]);

  const updateOrderStatus = useCallback((id: string, status: OrderStatus, actor: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const stageIdx = o.timeline.findIndex((t) => t.stage === status);
        const timeline =
          stageIdx === -1
            ? o.timeline
            : o.timeline.map((t, i) => (i <= stageIdx ? { ...t, complete: true } : { ...t, complete: false }));
        return { ...o, status, timeline };
      })
    );
    toast("Order status updated", { description: `${id} → ${status}`, variant: "success" });
    void actor;
  }, []);

  const addInternalNote = useCallback((id: string, author: string, message: string) => {
    const note: OrderNote = { id: genId("note"), author, message, date: new Date().toISOString() };
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, internalNotes: [note, ...(o.internalNotes ?? [])] } : o)));
    toast("Internal note added");
  }, []);

  const addCustomerNote = useCallback((id: string, author: string, message: string) => {
    const note: OrderNote = { id: genId("note"), author, message, date: new Date().toISOString() };
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, customerNotes: [note, ...(o.customerNotes ?? [])] } : o)));
    toast("Note sent to customer");
  }, []);

  const cancelOrder = useCallback((id: string, reason: string, actor: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, status: "Cancelled" as OrderStatus, cancelledAt: new Date().toISOString(), cancelledReason: reason }
          : o
      )
    );
    toast("Order cancelled", { description: id, variant: "error" });
    void actor;
  }, []);

  const duplicateOrder = useCallback(
    (id: string) => {
      const source = orders.find((o) => o.id === id);
      if (!source) return undefined;
      const stages: OrderStage[] = source.timeline.map((t) => t.stage);
      const now = new Date().toISOString();
      const newId = `MOM-${Math.floor(100000 + Math.random() * 900000)}`;
      const duplicate: Order = {
        ...source,
        id: newId,
        date: now,
        status: "Order Placed",
        paymentStatus: "pending",
        internalNotes: [],
        customerNotes: [],
        cancelledAt: undefined,
        cancelledReason: undefined,
        timeline: stages.map((stage, i) => ({ stage, date: now, complete: i === 0 })),
        production: { priority: source.productionSpeed === "express" ? 90 : 40, notes: [] },
        channel: "admin",
      };
      setOrders((prev) => [duplicate, ...prev]);
      toast("Order duplicated", { description: newId, variant: "success" });
      return newId;
    },
    [orders]
  );

  const assignProduction = useCallback((id: string, staffId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, production: { ...(o.production ?? { priority: 40, notes: [] }), assignedStaffId: staffId } } : o))
    );
    toast("Production staff assigned");
  }, []);

  const updateProductionInfo = useCallback((id: string, patch: Partial<NonNullable<Order["production"]>>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, production: { ...(o.production ?? { priority: 40, notes: [] }), ...patch } } : o))
    );
  }, []);

  const setPaymentStatus = useCallback((id: string, status: Order["paymentStatus"]) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, paymentStatus: status } : o)));
    toast("Payment status updated");
  }, []);

  const updateCustomizationStatus = useCallback(
    (id: string, status: CustomizationApprovalStatus, actor: string, note?: string) => {
      let orderForNotification: Order | undefined;
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const notes = note ? [{ id: genId("note"), author: actor, message: note, date: new Date().toISOString() }, ...(o.internalNotes ?? [])] : o.internalNotes;
          const updated = { ...o, customizationStatus: status, internalNotes: notes };
          orderForNotification = updated;
          return updated;
        })
      );
      // The customer must be notified whenever their custom order needs
      // clarification before production can proceed (Section 9).
      if (status === "clarification_requested" && orderForNotification) {
        logNotification({
          triggerId: "nt-11",
          channel: "email",
          recipient: orderForNotification.customerEmail ?? "unknown",
          subject: `We need a little more detail on ${id}`,
          status: "sent",
        });
      }
      toast("Customization review updated", { description: status.replace(/_/g, " "), variant: "success" });
    },
    [logNotification]
  );

  return (
    <OrdersContext.Provider
      value={{
        orders,
        addOrder,
        advanceOrder,
        getOrder,
        isReady,
        updateOrderStatus,
        addInternalNote,
        addCustomerNote,
        cancelOrder,
        duplicateOrder,
        assignProduction,
        updateProductionInfo,
        setPaymentStatus,
        updateCustomizationStatus,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
