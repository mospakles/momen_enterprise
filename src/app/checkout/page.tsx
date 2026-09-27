"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useOrders } from "@/lib/orders-context";
import { isCustomOrder, stagesForItems } from "@/lib/order-stages";
import { useAdminStore } from "@/lib/admin/store";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { formatNaira, addBusinessDays, formatDateRange } from "@/lib/format";
import { Address, Order, ProductionSpeed } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { toast } from "@/lib/toast";

const STEPS = ["Contact", "Delivery", "Production", "Payment", "Review"];

// Kept at module scope (rather than inline in the component) so the React
// Compiler doesn't need to reason about impure calls (Math.random/Date.now)
// inside a component body — these only ever run from the "Place Order" click
// handler, never during render.
function generateOrderId() {
  return `MOM-${Math.floor(100000 + Math.random() * 900000)}`;
}
function generateTransactionId() {
  return `TXN-${Date.now().toString(36).toUpperCase()}`;
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart, isReady } = useCart();
  const { addOrder } = useOrders();
  const { deliveryZones, productionSettings, coupons, setCoupons } = useAdminStore();
  const { currentUser } = useCustomerAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [contact, setContact] = useState({ fullName: "", email: "", phone: "" });
  const [address, setAddress] = useState<Address>({
    fullName: "",
    country: "Nigeria",
    state: "",
    city: "",
    address: "",
    apartment: "",
    postalCode: "",
    phone: "",
  });
  const [saveAddress, setSaveAddress] = useState(true);
  const [speedChoice, setSpeed] = useState<ProductionSpeed>("standard");
  const [payment, setPayment] = useState<"card" | "transfer">("card");
  const [confirmed, setConfirmed] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && items.length === 0 && !placing) router.replace("/cart");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, items.length]);

  // Prefill contact + address for a signed-in customer — a convenience only,
  // never overwrites anything the shopper has already typed.
  useEffect(() => {
    if (!currentUser) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time prefill from the auth session, not a derived value
    setContact((c) => (c.fullName || c.email ? c : { fullName: currentUser.name, email: currentUser.email, phone: currentUser.phone ?? "" }));
    const savedAddress = currentUser.addresses[0];
    if (savedAddress) setAddress((a) => (a.address ? a : savedAddress));
  }, [currentUser]);

  // Delivery pricing/timelines come from the admin-configured zone matching
  // the customer's country — falling back to the global production defaults
  // (Settings → Production & Delivery) when no specific zone applies. This is
  // the live link between /admin/delivery and the storefront checkout.
  const zone = useMemo(
    () => deliveryZones.find((z) => z.active && z.countries.includes(address.country)),
    [deliveryZones, address.country]
  );
  const settings = {
    standardDays: zone?.standardDays ?? productionSettings.standardDays,
    expressDays: zone?.expressDays ?? productionSettings.expressDays,
    standardFee: zone?.standardFee ?? productionSettings.standardFee,
    expressFee: zone?.expressFee ?? productionSettings.expressFee,
    expressAvailable: zone?.expressAvailable ?? true,
    freeDeliveryThreshold: zone?.freeDeliveryThreshold,
  };

  // If the destination's zone doesn't support express, fall back to standard
  // for all downstream calculations/display without needing to correct state
  // in an effect — the user's raw choice is still remembered if they change
  // address back to an express-eligible zone.
  const speed: ProductionSpeed = settings.expressAvailable ? speedChoice : "standard";

  const expressFee = speed === "express" ? settings.expressFee : 0;
  const freeDelivery = settings.freeDeliveryThreshold !== undefined && subtotal >= settings.freeDeliveryThreshold;
  const deliveryFee = freeDelivery ? 0 : settings.standardFee;
  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal + deliveryFee + expressFee - discount);

  // Not memoized: `settings`/`productionRange` are freshly-derived plain
  // objects every render (from the zone lookup above), so there's nothing
  // stable to key a memo on — and the computation itself is trivial.
  const productionRange = speed === "express" ? settings.expressDays : settings.standardDays;
  const completionRange = {
    from: addBusinessDays(new Date(), productionRange[0]),
    to: addBusinessDays(new Date(), productionRange[1]),
  };
  const deliveryDate = addBusinessDays(completionRange.to, 2);

  const missingMeasurements = items.some(
    (i) =>
      i.product.productionType === "made-to-measure" &&
      !(i.customOrder && i.size !== "Made-to-Measure") && // standard size chosen via the customization wizard
      (!i.measurement || i.measurement.mode === "pending")
  );

  function applyCoupon() {
    setCouponError(null);
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    const coupon = coupons.find((c) => c.code === code);
    if (!coupon || !coupon.active) return setCouponError("That code isn't valid.");
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return setCouponError("That code has expired.");
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return setCouponError("That code has reached its usage limit.");
    if (coupon.minOrderValue && subtotal < coupon.minOrderValue) return setCouponError(`Minimum order value is ${formatNaira(coupon.minOrderValue)}.`);
    const amount = coupon.type === "percentage" ? Math.round((subtotal * coupon.value) / 100) : Math.min(coupon.value, subtotal);
    setAppliedCoupon({ code: coupon.code, discount: amount });
    toast("Coupon applied", { description: coupon.code, variant: "success" });
  }

  function placeOrder() {
    setPlacing(true);
    const now = new Date().toISOString();
    const order: Order = {
      id: generateOrderId(),
      date: now,
      items,
      subtotal,
      deliveryFee,
      expressFee,
      discount,
      couponCode: appliedCoupon?.code,
      total,
      productionSpeed: speed,
      estimatedCompletion: formatDateRange(completionRange.from, completionRange.to),
      estimatedDelivery: deliveryDate.toISOString(),
      paymentStatus: "paid",
      paymentMethod: payment,
      paymentProvider: payment === "transfer" ? "Bank Transfer" : "Paystack",
      transactionId: generateTransactionId(),
      address,
      customerEmail: contact.email,
      internalNotes: [],
      customerNotes: [],
      production: { priority: speed === "express" ? 90 : 40, notes: [], expectedCompletionDate: completionRange.to.toISOString() },
      channel: "web",
      timeline: stagesForItems(items).map((stage, i) => ({
        stage,
        date: now,
        complete: i <= 1,
        message: i === 0 ? "We've received your order." : i === 1 ? "Payment received successfully." : undefined,
      })),
      status: "Payment Confirmed",
      // Orders where a customer went beyond the standard configured options
      // (uploaded reference images or wrote special instructions) enter the
      // admin approval workflow (Section 9) rather than going straight to
      // production untouched.
      customizationStatus: isCustomOrder(items) ? "submitted" : "not_applicable",
    };
    addOrder(order);
    if (appliedCoupon) {
      setCoupons((prev) => prev.map((c) => (c.code === appliedCoupon.code ? { ...c, usageCount: c.usageCount + 1 } : c)));
    }
    setTimeout(() => {
      clearCart();
      toast("Order placed", { description: order.id, variant: "success" });
      router.push(`/checkout/confirmation?order=${order.id}`);
    }, 900);
  }

  if (!isReady || items.length === 0) return <div className="mx-auto max-w-4xl px-4 py-24" />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl sm:text-4xl">Checkout</h1>

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-2 ${i <= step ? "text-ink" : "text-ink/30"}`}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${i <= step ? "border-brass bg-brass text-ivory" : "border-line"}`}>
              {i + 1}
            </span>
            {s}
            {i < STEPS.length - 1 && <span className="mx-1 text-line">—</span>}
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px]">
        <div>
          {step === 0 && (
            <StepCard title="Contact Information">
              <Field label="Full Name" value={contact.fullName} onChange={(v) => setContact({ ...contact, fullName: v })} />
              <Field label="Email" type="email" value={contact.email} onChange={(v) => setContact({ ...contact, email: v })} />
              <Field label="Phone Number" type="tel" value={contact.phone} onChange={(v) => setContact({ ...contact, phone: v })} />
            </StepCard>
          )}

          {step === 1 && (
            <StepCard title="Delivery Address">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full Name" value={address.fullName} onChange={(v) => setAddress({ ...address, fullName: v })} />
                <Field label="Country" value={address.country} onChange={(v) => setAddress({ ...address, country: v })} />
                <Field label="State / Region" value={address.state} onChange={(v) => setAddress({ ...address, state: v })} />
                <Field label="City" value={address.city} onChange={(v) => setAddress({ ...address, city: v })} />
              </div>
              <Field label="Address" value={address.address} onChange={(v) => setAddress({ ...address, address: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Apartment / Suite (optional)" value={address.apartment ?? ""} onChange={(v) => setAddress({ ...address, apartment: v })} />
                <Field label="Postal Code" value={address.postalCode} onChange={(v) => setAddress({ ...address, postalCode: v })} />
              </div>
              <Field label="Phone Number" type="tel" value={address.phone} onChange={(v) => setAddress({ ...address, phone: v })} />
              <label className="flex items-center gap-2 text-xs text-ink/60">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="accent-brass" />
                Save this address to my account
              </label>
              {!zone && (
                <p className="text-xs text-clay">
                  We don&rsquo;t have a dedicated delivery zone for {address.country || "this country"} yet — standard global rates apply.
                </p>
              )}
            </StepCard>
          )}

          {step === 2 && (
            <StepCard title="Production & Delivery Preference">
              {missingMeasurements && (
                <div className="mb-4 border border-error/40 bg-error/5 p-4 text-sm text-error">
                  One or more made-to-measure items are missing measurements. Please add them before payment.
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  onClick={() => setSpeed("standard")}
                  className={`border p-5 text-left ${speed === "standard" ? "border-brass bg-ivory-deep/40" : "border-line"}`}
                >
                  <p className="font-display text-lg">Standard</p>
                  <p className="mt-2 text-sm text-ink/70">
                    Production: {settings.standardDays[0]}–{settings.standardDays[1]} business days
                  </p>
                  <p className="mt-1 text-sm text-ink/70">Delivery fee: {freeDelivery ? "Free" : formatNaira(settings.standardFee)}</p>
                </button>
                <button
                  onClick={() => settings.expressAvailable && setSpeed("express")}
                  disabled={!settings.expressAvailable}
                  className={`border p-5 text-left disabled:cursor-not-allowed disabled:opacity-40 ${speed === "express" ? "border-brass bg-ivory-deep/40" : "border-line"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-display text-lg">Express</p>
                    <span className="eyebrow text-brass">{settings.expressAvailable ? "Priority" : "Unavailable"}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink/70">
                    {settings.expressAvailable
                      ? `Priority production: ${settings.expressDays[0]}–${settings.expressDays[1]} business days`
                      : "Not available for this destination."}
                  </p>
                  {settings.expressAvailable && <p className="mt-1 text-sm text-ink/70">+ Express fee: {formatNaira(settings.expressFee)}</p>}
                </button>
              </div>

              <div className="mt-6 border border-line bg-ivory-deep/30 p-5 text-sm">
                <p>
                  <span className="text-ink/60">Estimated completion:</span>{" "}
                  {formatDateRange(completionRange.from, completionRange.to)}
                </p>
                <p className="mt-1">
                  <span className="text-ink/60">Estimated delivery:</span> on or before{" "}
                  {deliveryDate.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                {speed === "express" && (
                  <p className="mt-1">
                    <span className="text-ink/60">Express fee:</span> {formatNaira(settings.expressFee)}
                  </p>
                )}
              </div>
            </StepCard>
          )}

          {step === 3 && (
            <StepCard title="Payment">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setPayment("card")}
                  className={`border p-4 text-left text-sm ${payment === "card" ? "border-brass bg-ivory-deep/40" : "border-line"}`}
                >
                  Card Payment
                </button>
                <button
                  onClick={() => setPayment("transfer")}
                  className={`border p-4 text-left text-sm ${payment === "transfer" ? "border-brass bg-ivory-deep/40" : "border-line"}`}
                >
                  Bank Transfer
                </button>
              </div>
              {payment === "card" ? (
                <div className="mt-5 grid gap-4">
                  <Field label="Card Number" value="" onChange={() => {}} placeholder="•••• •••• •••• ••••" />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Expiry" value="" onChange={() => {}} placeholder="MM / YY" />
                    <Field label="CVC" value="" onChange={() => {}} placeholder="•••" />
                  </div>
                  <p className="text-xs text-ink/40">
                    Card details are processed securely by our payment provider — Momen never stores raw card
                    information.
                  </p>
                </div>
              ) : (
                <div className="mt-5 border border-line bg-ivory-deep/30 p-5 text-sm text-ink/70">
                  Transfer instructions and a unique reference will be issued on the next step. Orders are
                  confirmed once payment clears.
                </div>
              )}
            </StepCard>
          )}

          {step === 4 && (
            <StepCard title="Order Review">
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.product.name} × {item.quantity}{" "}
                      <span className="text-ink/50">
                        ({item.size}, {item.color})
                      </span>
                    </span>
                    <span>{formatNaira(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-line pt-4 text-sm text-ink/70">
                <p>{address.fullName}, {address.address}, {address.city}, {address.state}, {address.country}</p>
                <p className="mt-1">{speed === "express" ? "Express" : "Standard"} production &amp; delivery</p>
                <p className="mt-1">Payment via {payment === "card" ? "Card" : "Bank Transfer"}</p>
              </div>

              <div className="mt-5 border-t border-line pt-4">
                {appliedCoupon ? (
                  <p className="text-sm text-clay">
                    Coupon <span className="font-medium">{appliedCoupon.code}</span> applied — −{formatNaira(appliedCoupon.discount)}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Coupon code"
                      className="flex-1 border border-line bg-ivory px-3 py-2 text-sm outline-none focus:border-brass"
                    />
                    <button onClick={applyCoupon} className="eyebrow border border-line px-4 hover:border-brass">
                      Apply
                    </button>
                  </div>
                )}
                {couponError && <p className="mt-1.5 text-xs text-error">{couponError}</p>}
              </div>

              <label className="mt-5 flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 accent-brass"
                />
                I confirm that my measurements and order details are correct.
              </label>
            </StepCard>
          )}

          <div className="mt-8 flex gap-3">
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 2 && missingMeasurements}
              >
                Continue
              </Button>
            ) : (
              <Button onClick={placeOrder} disabled={!confirmed || placing}>
                {placing ? "Placing Order…" : "Place Order"}
              </Button>
            )}
          </div>
        </div>

        <div className="h-fit border border-line p-6">
          <p className="eyebrow mb-4">Order Summary</p>
          <div className="space-y-2.5 text-sm">
            <Row label="Subtotal" value={formatNaira(subtotal)} />
            <Row label="Delivery Fee" value={freeDelivery ? "Free" : formatNaira(deliveryFee)} />
            <Row label="Express Fee" value={expressFee ? formatNaira(expressFee) : "—"} />
            <Row label="Discount" value={discount ? `−${formatNaira(discount)}` : "—"} />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <p className="font-medium">Total</p>
            <p className="font-display text-xl">{formatNaira(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-6 font-display text-2xl">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-ink/60">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink/60">{label}</span>
      <span className="text-ink/80">{value}</span>
    </div>
  );
}
