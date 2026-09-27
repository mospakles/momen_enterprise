// Generates a realistic order history so the admin dashboard (and the
// storefront's own account/orders pages) aren't empty on first load. Only
// used once, the very first time `OrdersProvider` finds nothing in
// localStorage — after that, every mutation (checkout, admin status change,
// refund, etc.) persists on top of it exactly like real order data would.

import { products } from "@/lib/mock-data";
import { customers } from "@/lib/admin/seed-data";
import { ORDER_STAGES, isCustomOrder, stagesForItems } from "@/lib/order-stages";
import type { Address, CartItem, CustomOrderDetails, Order, OrderStage, OrderTimelineEntry, ProductionSpeed } from "@/lib/types";

export { ORDER_STAGES };

function addressFromCustomer(idx: number): Address {
  const c = customers[idx % customers.length];
  const a = c.addresses[0];
  return a
    ? { ...a }
    : { fullName: c.name, country: "Nigeria", state: "Lagos", city: "Lagos", address: "1 Broad Street", postalCode: "101233", phone: c.phone ?? "+234 800 000 0000" };
}

interface OrderSpec {
  daysAgo: number;
  customerIdx: number;
  items: { productSlug: string; size: string; color: string; qty: number; customOrder?: CustomOrderDetails }[];
  speed: ProductionSpeed;
  completedCount: number; // how many timeline stages are complete
  exception?: Order["status"];
  paymentStatus: Order["paymentStatus"];
  couponCode?: string;
  discount?: number;
  channel?: Order["channel"];
  assignStaff?: string;
  internalNote?: string;
  /** Overrides the customization status that would otherwise be derived
   * from whether any item carries reference images / special instructions —
   * used here purely to seed a realistic spread of approval-workflow states
   * for demo purposes. */
  customizationStatus?: Order["customizationStatus"];
}

const SPECS: OrderSpec[] = [
  { daysAgo: 88, customerIdx: 0, items: [{ productSlug: "obi-tailored-shirt", size: "M", color: "Ivory", qty: 1 }, { productSlug: "femi-straight-trouser", size: "32", color: "Black", qty: 1 }], speed: "standard", completedCount: 10, paymentStatus: "paid" },
  { daysAgo: 82, customerIdx: 3, items: [{ productSlug: "adaeze-wrap-dress", size: "S", color: "Terracotta", qty: 1 }], speed: "express", completedCount: 10, paymentStatus: "paid", channel: "web" },
  { daysAgo: 75, customerIdx: 1, items: [{ productSlug: "tobi-linen-shirt", size: "L", color: "Ecru", qty: 2 }], speed: "standard", completedCount: 10, paymentStatus: "paid" },
  { daysAgo: 70, customerIdx: 7, items: [{ productSlug: "dara-signature-set", size: "M", color: "Bronze", qty: 1 }], speed: "express", completedCount: 10, paymentStatus: "paid", couponCode: "WELCOME10", discount: 19800 },
  { daysAgo: 61, customerIdx: 4, items: [{ productSlug: "sade-tapered-trouser", size: "30", color: "Black", qty: 1 }], speed: "standard", completedCount: 10, paymentStatus: "refunded", exception: "Refunded", internalNote: "Customer reported sizing issue; full refund approved by Finance." },
  { daysAgo: 55, customerIdx: 2, items: [{ productSlug: "kaya-two-piece-set", size: "M", color: "Sand", qty: 1 }], speed: "standard", completedCount: 10, paymentStatus: "paid" },
  {
    daysAgo: 48, customerIdx: 5, speed: "express", completedCount: 8, paymentStatus: "paid", assignStaff: "ps-2",
    items: [{
      productSlug: "amadi-classic-kaftan", size: "Made-to-Measure", color: "Ink Black", qty: 1,
      customOrder: { fabricId: "fab-premium-cotton", primaryColor: "Ink Black", referenceImages: ["https://picsum.photos/seed/ref-kaftan-1/900/1100"], referenceNotes: "Match this neckline shape.", specialInstructions: "Please add a slightly deeper side vent than standard." },
    }],
    customizationStatus: "confirmed",
  },
  { daysAgo: 44, customerIdx: 8, items: [{ productSlug: "obi-tailored-shirt", size: "L", color: "Charcoal", qty: 1 }], speed: "standard", completedCount: 7, paymentStatus: "paid", assignStaff: "ps-1" },
  { daysAgo: 39, customerIdx: 0, items: [{ productSlug: "femi-straight-trouser", size: "32", color: "Navy", qty: 1 }, { productSlug: "obi-tailored-shirt", size: "M", color: "Clay", qty: 1 }], speed: "standard", completedCount: 6, paymentStatus: "paid", assignStaff: "ps-3" },
  { daysAgo: 34, customerIdx: 3, items: [{ productSlug: "adaeze-wrap-dress", size: "M", color: "Ink", qty: 1 }], speed: "express", completedCount: 6, paymentStatus: "paid", assignStaff: "ps-2", internalNote: "Customer requested 2cm added to sleeve length after order placed — confirmed with tailor." },
  { daysAgo: 28, customerIdx: 6, items: [{ productSlug: "sade-tapered-trouser", size: "28", color: "Clay", qty: 1 }], speed: "standard", completedCount: 2, paymentStatus: "failed", exception: "Payment Failed" },
  { daysAgo: 25, customerIdx: 9, items: [{ productSlug: "tobi-linen-shirt", size: "M", color: "Olive", qty: 1 }], speed: "express", completedCount: 4, paymentStatus: "paid" },
  {
    daysAgo: 21, customerIdx: 1, speed: "standard", completedCount: 2, paymentStatus: "paid", assignStaff: "ps-4",
    items: [{
      productSlug: "kunle-complete-senator-set", size: "Made-to-Measure", color: "Deep Navy", qty: 1,
      customOrder: { fabricId: "fab-senator-premium", primaryColor: "Deep Navy", secondaryColor: "Ink Black", specialInstructions: "Want the trouser slightly slimmer through the thigh than a standard cut — can you confirm this is possible on this fabric?" },
    }],
    customizationStatus: "clarification_requested",
    internalNote: "Requested photo reference for the trouser silhouette customer has in mind before approving.",
  },
  { daysAgo: 18, customerIdx: 4, items: [{ productSlug: "nia-occasion-gown", size: "M", color: "Ink", qty: 1 }], speed: "standard", completedCount: 3, paymentStatus: "paid" },
  { daysAgo: 14, customerIdx: 2, items: [{ productSlug: "kaya-two-piece-set", size: "S", color: "Charcoal", qty: 1 }], speed: "express", completedCount: 3, paymentStatus: "paid", assignStaff: "ps-1" },
  {
    daysAgo: 12, customerIdx: 7, speed: "standard", completedCount: 1, paymentStatus: "paid",
    items: [{
      productSlug: "obasi-embroidered-kaftan", size: "Made-to-Measure", color: "Burgundy", qty: 1,
      customOrder: { fabricId: "fab-guinea-brocade", primaryColor: "Burgundy", referenceImages: ["https://picsum.photos/seed/ref-kaftan-2/900/1100"], referenceNotes: "Embroidery pattern like this, but in gold thread." },
    }],
    customizationStatus: "awaiting_customer_confirmation",
  },
  { daysAgo: 9, customerIdx: 5, items: [{ productSlug: "obi-tailored-shirt", size: "S", color: "Ivory", qty: 1 }], speed: "standard", completedCount: 1, paymentStatus: "paid", exception: "On Hold", internalNote: "Awaiting customer response on collar preference — emailed twice, no reply." },
  {
    daysAgo: 6, customerIdx: 8, speed: "express", completedCount: 1, paymentStatus: "paid",
    items: [{
      productSlug: "amadi-classic-kaftan", size: "Made-to-Measure", color: "Bronze", qty: 1,
      customOrder: { fabricId: "fab-linen", primaryColor: "Bronze", specialInstructions: "No breast pocket, please — I prefer a completely plain front." },
    }],
    customizationStatus: "under_review",
  },
  { daysAgo: 4, customerIdx: 9, items: [{ productSlug: "adaeze-wrap-dress", size: "S", color: "Ivory", qty: 1 }], speed: "express", completedCount: 1, paymentStatus: "paid" },
  { daysAgo: 2, customerIdx: 6, items: [{ productSlug: "dara-signature-set", size: "M", color: "Ivory", qty: 1 }], speed: "standard", completedCount: 0, paymentStatus: "pending", exception: "Awaiting Customer Response" },
  { daysAgo: 1, customerIdx: 3, items: [{ productSlug: "tobi-linen-shirt", size: "S", color: "Ecru", qty: 1 }], speed: "standard", completedCount: 10, paymentStatus: "paid", exception: "Cancelled", internalNote: "Customer requested cancellation before production started; no charge applied." },
];

function buildTimeline(stages: OrderStage[], placedAt: Date, completedCount: number): OrderTimelineEntry[] {
  return stages.map((stage, i) => {
    const complete = i < completedCount;
    const date = new Date(placedAt.getTime() + i * 1.6 * 86_400_000);
    return {
      stage,
      date: date.toISOString(),
      complete,
      message:
        i === 0 ? "We've received your order." : i === 1 ? "Payment received successfully." : i === stages.length - 1 && complete ? "Delivered — thank you for ordering with Momen." : undefined,
    };
  });
}

export function generateSeedOrders(): Order[] {
  return SPECS.map((spec, idx) => {
    const now = Date.now();
    const placedAt = new Date(now - spec.daysAgo * 86_400_000);
    const items: CartItem[] = spec.items.map((it, j) => {
      const product = products.find((p) => p.slug === it.productSlug) ?? products[0];
      return {
        id: `${product.id}-${it.size}-${it.color}-${idx}-${j}`,
        product,
        size: it.size,
        color: it.color,
        quantity: it.qty,
        measurement:
          product.productionType === "made-to-measure"
            ? { mode: "manual", unit: "cm", values: { bust: 92, waist: 76, hip: 98, shoulder: 40, height: 168 } }
            : undefined,
        customOrder: it.customOrder,
      };
    });
    const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    const deliveryFee = 3500;
    const expressFee = spec.speed === "express" ? 25000 : 0;
    const discount = spec.discount ?? 0;
    const total = subtotal + deliveryFee + expressFee - discount;
    const stages = stagesForItems(items);
    const completedCount = Math.min(spec.completedCount, stages.length);
    const timeline = buildTimeline(stages, placedAt, completedCount);
    const customer = customers[spec.customerIdx % customers.length];
    const address = addressFromCustomer(spec.customerIdx);
    const lastComplete = timeline.filter((t) => t.complete).slice(-1)[0];
    const inProduction = completedCount > 0 && completedCount < stages.length && !spec.exception;

    const order: Order = {
      id: `MOM-${100000 + idx * 137 + spec.daysAgo}`,
      date: placedAt.toISOString(),
      items,
      subtotal,
      deliveryFee,
      expressFee,
      discount,
      couponCode: spec.couponCode,
      total,
      productionSpeed: spec.speed,
      estimatedCompletion: `${stages.length - 2}–${stages.length} business days`,
      estimatedDelivery: new Date(placedAt.getTime() + 14 * 86_400_000).toISOString(),
      paymentStatus: spec.paymentStatus,
      paymentMethod: idx % 3 === 0 ? "transfer" : "card",
      paymentProvider: idx % 3 === 0 ? "Bank Transfer" : idx % 2 === 0 ? "Paystack" : "Flutterwave",
      transactionId: `TXN-${(800000 + idx * 91).toString(36).toUpperCase()}`,
      address,
      timeline,
      status: spec.exception ?? lastComplete?.stage ?? "Order Placed",
      customerId: customer.id,
      customerEmail: customer.email,
      internalNotes: spec.internalNote ? [{ id: `note-${idx}`, author: "Tolu Fashina", message: spec.internalNote, date: placedAt.toISOString() }] : [],
      customerNotes: [],
      production: {
        assignedStaffId: spec.assignStaff,
        priority: spec.speed === "express" ? 90 : 40,
        startDate: completedCount >= 4 ? new Date(placedAt.getTime() + 3 * 86_400_000).toISOString() : undefined,
        expectedCompletionDate: new Date(placedAt.getTime() + (spec.speed === "express" ? 5 : 12) * 86_400_000).toISOString(),
        actualCompletionDate: completedCount >= 8 ? new Date(placedAt.getTime() + 9 * 86_400_000).toISOString() : undefined,
        notes: [],
      },
      cancelledAt: spec.exception === "Cancelled" ? new Date(placedAt.getTime() + 86_400_000).toISOString() : undefined,
      cancelledReason: spec.exception === "Cancelled" ? "Customer requested cancellation" : undefined,
      channel: spec.channel ?? "web",
      customizationStatus: spec.customizationStatus ?? (isCustomOrder(items) ? "submitted" : "not_applicable"),
    };
    void inProduction;
    return order;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
