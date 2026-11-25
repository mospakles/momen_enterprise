"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CustomizationApprovalStatus, Order, OrderStatus } from "./types";
import { ORDER_STAGES } from "./order-stages";
import { apiRequest } from "./api";
import { useCustomerAuth } from "./customer-auth-context";
import { toast } from "./toast";
import { withCurrentItemImages } from "./brand-images";

const withCurrentOrderImages = (order: Order): Order => ({ ...order, items: withCurrentItemImages(order.items) });

export { ORDER_STAGES };

/** sessionStorage key the checkout writes after placing an order — lets
 * guests get back to it (confirmation, payment retry, order page). */
export const LAST_ORDER_KEY = "momen.last-order";

export function readLastOrder(): { id?: string; email?: string } {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) ?? "{}") as unknown;
    return parsed && typeof parsed === "object" ? (parsed as { id?: string; email?: string }) : {};
  } catch {
    return {};
  }
}

/** Guest order lookup (order number + the email used at checkout). */
export function fetchGuestOrder(id: string, email: string) {
  return apiRequest<Order>(`/orders/track?id=${encodeURIComponent(id.trim())}&email=${encodeURIComponent(email.trim())}`).then(withCurrentOrderImages);
}

/** Whether an order can still be paid by card from the storefront. */
export function canCompletePayment(order: Order) {
  return (
    order.paymentMethod === "card" &&
    (order.paymentStatus === "pending" || order.paymentStatus === "failed") &&
    order.status !== "Cancelled" &&
    !order.cancelledAt
  );
}

/** Re-opens the payment provider for an unpaid order. Locked against double
 * clicks; on success the browser leaves for the provider's page. */
export function usePaymentRetry() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = useCallback(async (orderId: string, customerEmail?: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const { authorizationUrl } = await apiRequest<{ authorizationUrl: string; reference: string }>("/payments/initialize", {
        method: "POST",
        body: { orderId, customerEmail: customerEmail || undefined },
      });
      window.location.assign(authorizationUrl);
      // Stay locked while the browser navigates away.
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't reach the payment provider. Please try again.");
      lock.current = false;
      setBusy(false);
    }
  }, []);
  return { start, busy, error };
}

interface OrdersContextValue {
  orders: Order[];
  addOrder: (order: Order) => void;
  getOrder: (id: string) => Order | undefined;
  refreshOrders: () => Promise<void>;
  isReady: boolean;
  updateOrderStatus: (id: string, status: OrderStatus, actor: string) => Promise<void>;
  addInternalNote: (id: string, author: string, message: string) => Promise<void>;
  addCustomerNote: (id: string, author: string, message: string) => Promise<void>;
  cancelOrder: (id: string, reason: string, actor: string) => Promise<void>;
  duplicateOrder: (id: string) => Promise<string | undefined>;
  assignProduction: (id: string, staffId: string) => Promise<void>;
  updateProductionInfo: (id: string, patch: Partial<NonNullable<Order["production"]>>) => Promise<void>;
  setPaymentStatus: (id: string, status: Order["paymentStatus"]) => Promise<void>;
  updateCustomizationStatus: (
    id: string,
    status: CustomizationApprovalStatus,
    actor: string,
    note?: string,
  ) => Promise<void>;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

function toApiStatus(status: OrderStatus) {
  return status.toLowerCase().replaceAll(" ", "_");
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "The order could not be updated.";
}

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useCustomerAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isReady, setIsReady] = useState(false);

  const refreshOrders = useCallback(async () => {
    const isAdmin = window.location.pathname.startsWith("/admin");
    if (!isAdmin && !currentUser) {
      setOrders([]);
      setIsReady(true);
      return;
    }
    try {
      const path = isAdmin ? "/admin/orders" : "/orders/mine";
      setOrders((await apiRequest<Order[]>(path)).map(withCurrentOrderImages));
    } catch {
      setOrders([]);
    } finally {
      setIsReady(true);
    }
  }, [currentUser]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading orders from the API (external system)
    void refreshOrders();
    const reload = () => void refreshOrders();
    window.addEventListener("momen:auth-changed", reload);
    return () => window.removeEventListener("momen:auth-changed", reload);
  }, [refreshOrders]);

  const replaceOrder = useCallback((incoming: Order) => {
    const saved = withCurrentOrderImages(incoming);
    setOrders((previous) => {
      const exists = previous.some((order) => order.id === saved.id);
      return exists ? previous.map((order) => (order.id === saved.id ? saved : order)) : [saved, ...previous];
    });
  }, []);

  const addOrder = useCallback((order: Order) => replaceOrder(order), [replaceOrder]);
  const getOrder = useCallback((id: string) => orders.find((order) => order.id === id), [orders]);

  const mutate = useCallback(
    async (path: string, options: { method: "POST" | "PATCH"; body?: unknown }, successMessage?: string) => {
      try {
        const saved = await apiRequest<Order>(path, options);
        replaceOrder(saved);
        if (successMessage) toast(successMessage, { variant: "success" });
        return saved;
      } catch (error) {
        toast("Order update failed", { description: errorText(error), variant: "error" });
        return undefined;
      }
    },
    [replaceOrder],
  );

  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus, _actor: string) => {
      await mutate(`/admin/orders/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: { status: toApiStatus(status) },
      }, "Order status updated");
    },
    [mutate],
  );

  const addNote = useCallback(
    async (id: string, audience: "internal" | "customer", message: string) => {
      await mutate(`/admin/orders/${encodeURIComponent(id)}/notes`, {
        method: "POST",
        body: { audience, message },
      }, audience === "internal" ? "Internal note added" : "Note sent to customer");
    },
    [mutate],
  );

  const addInternalNote = useCallback(
    async (id: string, _author: string, message: string) => addNote(id, "internal", message),
    [addNote],
  );
  const addCustomerNote = useCallback(
    async (id: string, _author: string, message: string) => addNote(id, "customer", message),
    [addNote],
  );

  const cancelOrder = useCallback(
    async (id: string, reason: string, _actor: string) => {
      await mutate(`/admin/orders/${encodeURIComponent(id)}/cancel`, { method: "POST", body: { reason } }, "Order cancelled");
    },
    [mutate],
  );

  const duplicateOrder = useCallback(async (id: string) => {
    const saved = await mutate(`/admin/orders/${encodeURIComponent(id)}/duplicate`, { method: "POST" }, "Order duplicated");
    return saved?.id;
  }, [mutate]);

  const assignProduction = useCallback(
    async (id: string, staffId: string) => {
      await mutate(`/admin/orders/${encodeURIComponent(id)}/production`, {
        method: "PATCH",
        body: { assignedStaffId: staffId },
      }, "Production staff assigned");
    },
    [mutate],
  );

  const updateProductionInfo = useCallback(
    async (id: string, patch: Partial<NonNullable<Order["production"]>>) => {
      const { assignedStaffId, priority, startDate, expectedCompletionDate, actualCompletionDate } = patch;
      await mutate(`/admin/orders/${encodeURIComponent(id)}/production`, {
        method: "PATCH",
        body: { assignedStaffId, priority, startDate, expectedCompletionDate, actualCompletionDate },
      });
    },
    [mutate],
  );

  const setPaymentStatus = useCallback(
    async (id: string, status: Order["paymentStatus"]) => {
      await mutate(`/admin/orders/${encodeURIComponent(id)}/payment-status`, {
        method: "PATCH",
        body: { status },
      }, "Payment status updated");
    },
    [mutate],
  );

  const updateCustomizationStatus = useCallback(
    async (id: string, status: CustomizationApprovalStatus, _actor: string, note?: string) => {
      const customerConfirm = status === "confirmed" && !window.location.pathname.startsWith("/admin");
      await mutate(
        customerConfirm
          ? `/orders/mine/${encodeURIComponent(id)}/customization-confirm`
          : `/admin/orders/${encodeURIComponent(id)}/customization-status`,
        { method: "PATCH", body: customerConfirm ? undefined : { status, note } },
        "Customization review updated",
      );
    },
    [mutate],
  );

  const value = useMemo<OrdersContextValue>(() => ({
    orders,
    addOrder,
    getOrder,
    refreshOrders,
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
  }), [
    orders, addOrder, getOrder, refreshOrders, isReady, updateOrderStatus, addInternalNote, addCustomerNote,
    cancelOrder, duplicateOrder, assignProduction, updateProductionInfo, setPaymentStatus, updateCustomizationStatus,
  ]);

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) throw new Error("useOrders must be used within OrdersProvider");
  return context;
}
