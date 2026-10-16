"use client";

// Distraction-free checkout: Contact → Delivery → Payment → Review. The
// order summary stays visible (collapsible on mobile). Every input is kept in
// session storage, so an error, a failed payment or a refresh never loses
// what the shopper typed. Prices, delivery and discounts are confirmed by
// the API when the order is created; nothing here is authoritative.

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { useCart } from "@/lib/cart-context";
import { useOrders } from "@/lib/orders-context";
import { useAdminStore } from "@/lib/admin/store";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { useCheckoutPrefs } from "@/lib/checkout-prefs";
import { formatNaira, addBusinessDays, formatDateRange } from "@/lib/format";
import { Address, Order, ProductionSpeed } from "@/lib/types";
import { apiRequest } from "@/lib/api";
import { itemFromProduct, track } from "@/lib/analytics";
import { EASE_HOUSE } from "@/lib/motion/ease";
import { toast } from "@/lib/toast";
import { needsMeasurements } from "@/lib/product-utils";
import MeasurementStatus, { measureHref } from "@/components/shop/MeasurementStatus";

const STEPS = ["Contact", "Delivery", "Payment", "Review"] as const;
const FORM_KEY = "momen.checkout.form";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti",
  "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

type Contact = { fullName: string; email: string; phone: string };
type Errors = Partial<Record<string, string>>;

const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());
const isPhone = (v: string) => v.replace(/[^\d]/g, "").length >= 10 && v.replace(/[^\d]/g, "").length <= 15;

function validateContact(c: Contact): Errors {
  const e: Errors = {};
  if (!c.fullName.trim()) e.fullName = "Tell us who we're dressing.";
  if (!isEmail(c.email)) e.email = c.email ? "That email doesn't look right — check for a typo." : "We'll send your receipt here.";
  if (!isPhone(c.phone)) e.phone = c.phone ? "Enter a full phone number, e.g. 0803 123 4567." : "Our courier will call this number.";
  return e;
}

function validateAddress(a: Address): Errors {
  const e: Errors = {};
  if (!a.fullName.trim()) e["a.fullName"] = "Who should receive the parcel?";
  if (!a.address.trim()) e["a.address"] = "Add a street address.";
  if (!a.city.trim()) e["a.city"] = "Add a city.";
  if (!a.state.trim()) e["a.state"] = "Choose a state.";
  if (!a.postalCode.trim()) e["a.postalCode"] = "Add a postal code (100001 for Lagos if unsure).";
  if (!isPhone(a.phone)) e["a.phone"] = "Add a reachable phone number.";
  return e;
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart, isReady } = useCart();
  const { addOrder } = useOrders();
  const { deliveryZones, productionSettings } = useAdminStore();
  const { currentUser, refreshProfile } = useCustomerAuth();
  const { prefs, update: updatePrefs, clear: clearPrefs } = useCheckoutPrefs();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [contact, setContact] = useState<Contact>({ fullName: "", email: "", phone: "" });
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
  const [savedAddressIndex, setSavedAddressIndex] = useState<number | null>(null);
  const [saveAddress, setSaveAddress] = useState(true);
  const [speedChoice, setSpeed] = useState<ProductionSpeed>("standard");
  const [payment, setPayment] = useState<"card" | "transfer">("card");
  const [method, setMethod] = useState<"delivery" | "pickup">("delivery");
  const [provider, setProvider] = useState<"paystack" | "flutterwave">("paystack");
  const [providers, setProviders] = useState<string[]>(["paystack"]);

  // Which card providers the API has credentials for (Paystack, Flutterwave).
  useEffect(() => {
    void apiRequest<{ providers: string[] }>("/payments/providers")
      .then((r) => {
        setProviders(r.providers);
        if (r.providers.length && !r.providers.includes(provider)) setProvider(r.providers[0] as "paystack" | "flutterwave");
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per visit
  }, []);
  const [confirmed, setConfirmed] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [restored, setRestored] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Restore anything typed earlier this session.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(FORM_KEY) ?? "null");
      if (saved) {
        /* eslint-disable react-hooks/set-state-in-effect -- restoring the shopper's own in-progress form */
        if (saved.contact) setContact(saved.contact);
        if (saved.address) setAddress(saved.address);
        if (saved.speed) setSpeed(saved.speed);
        if (saved.payment) setPayment(saved.payment);
        if (saved.method) setMethod(saved.method);
        if (typeof saved.step === "number") setStep(Math.min(saved.step, STEPS.length - 1));
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      // ignore
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(FORM_KEY, JSON.stringify({ step, contact, address, speed: speedChoice, payment, method }));
    } catch {
      // ignore
    }
  }, [restored, step, contact, address, speedChoice, payment, method]);

  useEffect(() => {
    if (isReady && items.length === 0 && !placing) router.replace("/cart");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, items.length]);

  useEffect(() => {
    if (isReady && items.length) track("begin_checkout", { value: subtotal, items: items.map((i) => itemFromProduct(i.product, i)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per checkout visit
  }, [isReady]);

  // Prefill contact + address for a signed-in customer — a convenience only,
  // never overwrites anything the shopper has already typed.
  useEffect(() => {
    if (!currentUser || !restored) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time prefill from the auth session, not a derived value
    setContact((c) => (c.fullName || c.email ? c : { fullName: currentUser.name, email: currentUser.email, phone: currentUser.phone ?? "" }));
    const savedAddress = currentUser.addresses[0];
    if (savedAddress && !address.address) {
      setAddress(savedAddress);
      setSavedAddressIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefill once per session load, never on later edits
  }, [currentUser, restored]);

  // Move focus to the step heading on step change (screen readers + keyboard).
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

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
    pickupAvailable: zone?.pickupAvailable ?? false,
    pickupLocation: zone?.pickupLocation,
    pickupFee: zone?.pickupFee ?? 0,
  };

  // If the destination's zone doesn't support express, fall back to standard
  // for all downstream calculations/display without needing to correct state
  // in an effect — the user's raw choice is still remembered if they change
  // address back to an express-eligible zone.
  const speed: ProductionSpeed = settings.expressAvailable ? speedChoice : "standard";

  const expressFee = speed === "express" ? settings.expressFee : 0;
  const freeDelivery = settings.freeDeliveryThreshold !== undefined && subtotal >= settings.freeDeliveryThreshold;
  // Pickup only where the zone offers it; otherwise fall back to courier.
  const pickup = method === "pickup" && settings.pickupAvailable;
  const deliveryFee = pickup ? settings.pickupFee : freeDelivery ? 0 : settings.standardFee;
  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal + deliveryFee + expressFee - discount);

  const productionRange = speed === "express" ? settings.expressDays : settings.standardDays;
  const completionRange = {
    from: addBusinessDays(new Date(), productionRange[0]),
    to: addBusinessDays(new Date(), productionRange[1]),
  };
  const deliveryDate = addBusinessDays(completionRange.to, 2);

  // Only pieces the customer chose to have cut to measure wait on measurements;
  // a standard size from the size guide goes straight to payment.
  const unmeasured = items.filter(needsMeasurements);
  const missingMeasurements = unmeasured.length > 0;

  async function applyCoupon(raw = couponInput, silent = false) {
    setCouponError(null);
    const code = raw.trim().toUpperCase();
    if (!code) return;
    try {
      const result = await apiRequest<{ code: string; discountAmount: number }>("/coupons/validate", {
        method: "POST",
        body: {
          code,
          subtotal,
          items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        },
      });
      setAppliedCoupon({ code: result.code, discount: result.discountAmount });
      updatePrefs({ couponCode: result.code });
      setCouponInput("");
      if (!silent) toast("Code applied", { description: `${result.code} — you save ${formatNaira(result.discountAmount)}`, variant: "success" });
    } catch (error) {
      setAppliedCoupon(null);
      if (silent) updatePrefs({ couponCode: undefined });
      setCouponError(error instanceof Error ? error.message : "That code could not be applied.");
    }
  }

  // A code chosen in the bag is re-validated against the live cart here.
  useEffect(() => {
    if (!isReady || !items.length || !prefs.couponCode || appliedCoupon?.code === prefs.couponCode) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- validating against the coupon API (external system)
    void applyCoupon(prefs.couponCode, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, prefs.couponCode, subtotal]);

  async function placeOrder() {
    setPlacing(true);
    setPlaceError(null);
    try {
      const order = await apiRequest<Order>("/orders", {
        method: "POST",
        body: {
          customerEmail: currentUser ? undefined : contact.email,
          address,
          productionSpeed: speed,
          deliveryMethod: pickup ? "pickup" : "delivery",
          paymentMethod: payment,
          couponCode: appliedCoupon?.code,
          giftWrap: prefs.giftWrap || undefined,
          giftMessage: prefs.giftMessage?.trim() || undefined,
          items: items.map((item) => ({
            productId: item.product.id,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            customizations: item.customizations,
            customOrder: item.customOrder,
            measurement: item.measurement ?? { mode: "pending", unit: "cm" }, // API requires one; "pending" + a standard size = sized from the guide
          })),
        },
      });
      addOrder(order);
      sessionStorage.setItem("momen.last-order", JSON.stringify({ id: order.id, email: contact.email }));
      if (currentUser && saveAddress && savedAddressIndex === null) {
        await apiRequest("/auth/addresses", { method: "POST", body: { ...address, isDefault: currentUser.addresses.length === 0 } }).catch(() => undefined);
        await refreshProfile().catch(() => undefined);
      }

      if (payment === "card") {
        const initialized = await apiRequest<{ authorizationUrl: string; reference: string }>("/payments/initialize", {
          method: "POST",
          body: { orderId: order.id, customerEmail: currentUser ? undefined : contact.email, provider: providers.includes(provider) ? provider : undefined },
        });
        clearCart();
        clearPrefs();
        sessionStorage.removeItem(FORM_KEY);
        window.location.assign(initialized.authorizationUrl);
        return;
      }

      clearCart();
      clearPrefs();
      sessionStorage.removeItem(FORM_KEY);
      router.push(`/checkout/confirmation?order=${order.id}`);
    } catch (error) {
      setPlaceError(error instanceof Error ? error.message : "Something interrupted your order. Nothing has been charged — please try again.");
      setPlacing(false);
    }
  }

  function next() {
    const found = step === 0 ? validateContact(contact) : step === 1 ? { ...validateAddress(address), ...(zone ? {} : { zone: "zone" }) } : {};
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    if (step === 1) track("add_shipping_info", { value: subtotal, shipping_tier: speed });
    if (step === 2) track("add_payment_info", { value: total, payment_type: payment });
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!isReady || items.length === 0) return <div className="mx-auto min-h-[70vh] max-w-6xl px-4 py-24" aria-busy="true" />;

  const summary = (
    <Summary
      items={items}
      subtotal={subtotal}
      deliveryFee={deliveryFee}
      pickup={pickup}
      freeDelivery={freeDelivery}
      expressFee={expressFee}
      discount={discount}
      total={total}
      coupon={appliedCoupon}
      couponInput={couponInput}
      couponError={couponError}
      onCouponInput={setCouponInput}
      onApply={() => void applyCoupon()}
      onRemoveCoupon={() => {
        setAppliedCoupon(null);
        updatePrefs({ couponCode: undefined });
      }}
      gift={prefs.giftWrap || Boolean(prefs.giftMessage)}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      {/* Mobile summary toggle */}
      <MobileSummary total={total} count={items.length}>{summary}</MobileSummary>

      <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-16">
        <div>
          <Progress step={step} onStep={(i) => i < step && setStep(i)} />

          <AnimatePresence mode="wait" initial={false}>
            <m.section
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.45, ease: EASE_HOUSE }}
              aria-labelledby="step-heading"
              className="mt-10"
            >
              <h1 id="step-heading" ref={headingRef} tabIndex={-1} className="display text-4xl outline-none sm:text-5xl">
                {["Who's it for?", "Where should it go?", "How would you like to pay?", "One last look."][step]}
              </h1>

              {step === 0 && (
                <div className="mt-8 space-y-6">
                  {!currentUser && (
                    <p className="text-sm text-ink/65">
                      Checking out as a guest.{" "}
                      <Link href="/login?redirect=/checkout" className="underline underline-offset-4">Sign in</Link> for saved addresses and measurements.
                    </p>
                  )}
                  <Field id="fullName" label="Full name" value={contact.fullName} error={errors.fullName} autoComplete="name" onChange={(v) => setContact({ ...contact, fullName: v })} />
                  <Field id="email" label="Email" type="email" inputMode="email" value={contact.email} error={errors.email} autoComplete="email" onChange={(v) => setContact({ ...contact, email: v })} hint="For your receipt and delivery updates." />
                  <Field id="phone" label="Phone" type="tel" inputMode="tel" value={contact.phone} error={errors.phone} autoComplete="tel" onChange={(v) => setContact({ ...contact, phone: v })} />
                </div>
              )}

              {step === 1 && (
                <div className="mt-8 space-y-8">
                  {currentUser && currentUser.addresses.length > 0 && (
                    <fieldset>
                      <legend className="label mb-3 text-ink/60">Saved addresses</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {currentUser.addresses.map((a, i) => (
                          <button
                            key={i}
                            type="button"
                            aria-pressed={savedAddressIndex === i}
                            onClick={() => {
                              setAddress(a);
                              setSavedAddressIndex(i);
                              setErrors({});
                            }}
                            className={`border p-4 text-left text-sm transition-colors ${savedAddressIndex === i ? "border-ink bg-bone" : "border-line hover:border-ink"}`}
                          >
                            <span className="font-medium">{a.fullName}</span>
                            <span className="mt-1 block text-ink/65">{a.address}, {a.city}, {a.state}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setSavedAddressIndex(null);
                            setAddress({ fullName: contact.fullName, country: "Nigeria", state: "", city: "", address: "", apartment: "", postalCode: "", phone: contact.phone });
                          }}
                          className={`border border-dashed p-4 text-left text-sm transition-colors ${savedAddressIndex === null ? "border-ink" : "border-line hover:border-ink"}`}
                        >
                          + A new address
                        </button>
                      </div>
                    </fieldset>
                  )}

                  {savedAddressIndex === null && (
                    <div className="space-y-6">
                      <Field id="a.fullName" label="Recipient" value={address.fullName || ""} error={errors["a.fullName"]} autoComplete="shipping name" onChange={(v) => setAddress({ ...address, fullName: v })} />
                      <AddressLookup
                        value={address.address}
                        error={errors["a.address"]}
                        onChange={(v) => setAddress({ ...address, address: v })}
                        onPick={(found) =>
                          setAddress((a) => ({
                            ...a,
                            address: found.address || a.address,
                            city: found.city || a.city,
                            state: NIGERIAN_STATES.find((st) => found.state && st.toLowerCase().startsWith(found.state.toLowerCase().replace("federal capital territory", "fct"))) ?? (found.state || a.state),
                            postalCode: found.postalCode || a.postalCode,
                          }))
                        }
                      />
                      <Field id="a.apartment" label="Apartment, suite, estate (optional)" value={address.apartment ?? ""} autoComplete="shipping address-line2" onChange={(v) => setAddress({ ...address, apartment: v })} />
                      <div className="grid gap-6 sm:grid-cols-2">
                        <Field id="a.city" label="City / area" value={address.city} error={errors["a.city"]} autoComplete="shipping address-level2" onChange={(v) => setAddress({ ...address, city: v })} />
                        <SelectField id="a.state" label="State" value={address.state} error={errors["a.state"]} options={address.country === "Nigeria" ? NIGERIAN_STATES : []} autoComplete="shipping address-level1" onChange={(v) => setAddress({ ...address, state: v })} />
                      </div>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <Field id="a.postalCode" label="Postal code" value={address.postalCode} error={errors["a.postalCode"]} inputMode="numeric" autoComplete="shipping postal-code" onChange={(v) => setAddress({ ...address, postalCode: v })} />
                        <Field id="a.phone" label="Phone for delivery" type="tel" inputMode="tel" value={address.phone} error={errors["a.phone"]} autoComplete="shipping tel" onChange={(v) => setAddress({ ...address, phone: v })} />
                      </div>
                      <Field id="a.country" label="Country" value={address.country} autoComplete="shipping country-name" onChange={(v) => setAddress({ ...address, country: v, state: "" })} />
                      {!address.phone && contact.phone && (
                        <button type="button" className="text-xs underline underline-offset-4" onClick={() => setAddress({ ...address, phone: contact.phone, fullName: address.fullName || contact.fullName })}>
                          Use my contact details for delivery
                        </button>
                      )}
                      {currentUser && (
                        <label className="flex items-center gap-2.5 text-sm text-ink/70">
                          <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-4 w-4 accent-ink" />
                          Save this address to my account
                        </label>
                      )}
                    </div>
                  )}

                  {!zone && (
                    <p role="alert" className="bg-error/5 p-4 text-sm text-error">
                      We don&rsquo;t deliver to {address.country || "this country"} online yet. <Link href="/contact" className="underline">Talk to us</Link> and we&rsquo;ll arrange it.
                    </p>
                  )}

                  {missingMeasurements && (
                    <div role="alert" className="bg-error/5 p-4 text-sm text-error">
                      <p>
                        {unmeasured.length === 1 ? "This piece is" : "These pieces are"} cut to your measurements, so we need them before payment:
                      </p>
                      <ul className="mt-2 space-y-1">
                        {unmeasured.map((item) => (
                          <li key={item.id}>
                            {item.product.name} —{" "}
                            <Link href={measureHref(item)} className="underline underline-offset-2">
                              add measurements
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <fieldset>
                    <legend className="label mb-3 text-ink/60">Delivery</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <OptionCard
                        selected={speed === "standard"}
                        onSelect={() => setSpeed("standard")}
                        title="Standard"
                        price={freeDelivery ? "Free" : formatNaira(settings.standardFee)}
                        lines={[`Ready in ${settings.standardDays[0]}–${settings.standardDays[1]} business days`, `Arrives by ${deliveryDate.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })}`]}
                      />
                      <OptionCard
                        selected={speed === "express"}
                        onSelect={() => settings.expressAvailable && setSpeed("express")}
                        disabled={!settings.expressAvailable}
                        title="Express"
                        price={settings.expressAvailable ? `+ ${formatNaira(settings.expressFee)}` : "Unavailable"}
                        lines={settings.expressAvailable ? [`Priority production, ${settings.expressDays[0]}–${settings.expressDays[1]} business days`, "Moves to the front of the atelier queue"] : ["Not available for this destination"]}
                      />
                    </div>
                    <p className="mt-3 text-xs text-ink/55">
                      Estimated completion {formatDateRange(completionRange.from, completionRange.to)}.
                    </p>
                  </fieldset>

                  {settings.pickupAvailable && (
                    <fieldset>
                      <legend className="label mb-3 text-ink/60">How you&rsquo;ll receive it</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <OptionCard
                          selected={!pickup}
                          onSelect={() => setMethod("delivery")}
                          title="Courier to your door"
                          price={freeDelivery ? "Free" : formatNaira(settings.standardFee)}
                          lines={["Delivered to the address above"]}
                        />
                        <OptionCard
                          selected={pickup}
                          onSelect={() => setMethod("pickup")}
                          title="Collect from the atelier"
                          price={settings.pickupFee ? formatNaira(settings.pickupFee) : "Free"}
                          lines={[settings.pickupLocation || "Lagos — we'll confirm the address by email", "We'll message you when it's ready"]}
                        />
                      </div>
                    </fieldset>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="mt-8 space-y-4">
                  {(providers.length ? providers : ["paystack"]).map((p) => (
                    <OptionCard
                      key={p}
                      selected={payment === "card" && provider === p}
                      onSelect={() => {
                        setPayment("card");
                        setProvider(p as "paystack" | "flutterwave");
                      }}
                      title={p === "flutterwave" ? "Pay with Flutterwave" : "Pay with Paystack"}
                      price="Card · Bank · USSD"
                      lines={[`You'll complete payment on ${p === "flutterwave" ? "Flutterwave" : "Paystack"}'s secure page. momen. never sees or stores your card details.`]}
                    />
                  ))}
                  <OptionCard
                    selected={payment === "transfer"}
                    onSelect={() => setPayment("transfer")}
                    title="Direct bank transfer"
                    price="Manual"
                    lines={["We reserve your order and send transfer details. Production begins once payment clears."]}
                  />
                  <p className="pt-2 text-xs text-ink/55">All prices in Naira (₦). International currencies are coming soon.</p>
                </div>
              )}

              {step === 3 && (
                <div className="mt-8 space-y-8">
                  <ReviewBlock title="Contact" onEdit={() => setStep(0)}>
                    {contact.fullName} · {contact.email} · {contact.phone}
                  </ReviewBlock>
                  <ReviewBlock title="Delivery" onEdit={() => setStep(1)}>
                    {address.fullName}, {address.address}{address.apartment ? `, ${address.apartment}` : ""}, {address.city}, {address.state}, {address.country}
                    <span className="block text-ink/55">
                      {speed === "express" ? "Express" : "Standard"} ·{" "}
                      {pickup
                        ? `collect from ${settings.pickupLocation || "the atelier"} from ${completionRange.to.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}`
                        : `arrives by ${deliveryDate.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}`}
                    </span>
                  </ReviewBlock>
                  <ReviewBlock title="Payment" onEdit={() => setStep(2)}>
                    {payment === "card" ? `${provider === "flutterwave" ? "Flutterwave" : "Paystack"} — card, bank or USSD` : "Direct bank transfer"}
                  </ReviewBlock>
                  {(prefs.giftWrap || prefs.giftMessage) && (
                    <ReviewBlock title="Gift" onEdit={() => updatePrefs({ giftWrap: false, giftMessage: "" })} editLabel="Remove">
                      {prefs.giftWrap && "Gift wrapped. "}
                      {prefs.giftMessage && <>Note: &ldquo;{prefs.giftMessage}&rdquo;</>}
                    </ReviewBlock>
                  )}

                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-ink" />
                    <span>
                      My measurements and order details are correct, and I accept the{" "}
                      <Link href="/terms-and-conditions" className="underline underline-offset-2">terms</Link>.
                    </span>
                  </label>

                  {placeError && (
                    <div role="alert" className="border border-error/40 bg-error/5 p-4 text-sm text-error">
                      <p className="font-medium">We couldn&rsquo;t place your order.</p>
                      <p className="mt-1">{placeError}</p>
                      <p className="mt-2 text-ink/60">Everything you entered is saved — you can try again.</p>
                    </div>
                  )}
                </div>
              )}
            </m.section>
          </AnimatePresence>

          <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {step > 0 ? (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="label link-line self-start text-ink/60 hover:text-ink">
                ← Back
              </button>
            ) : (
              <Link href="/cart" className="label link-line self-start text-ink/60 hover:text-ink">← Return to bag</Link>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                disabled={step === 1 && missingMeasurements}
                className="bg-ink px-10 py-4 text-sm tracking-wide text-ivory transition-colors duration-500 hover:bg-terracotta disabled:opacity-40"
              >
                Continue to {STEPS[step + 1].toLowerCase()}
              </button>
            ) : (
              <button
                type="button"
                onClick={placeOrder}
                disabled={!confirmed || placing || missingMeasurements}
                aria-busy={placing}
                className="flex items-center justify-center gap-3 bg-ink px-10 py-4 text-sm tracking-wide text-ivory transition-colors duration-500 hover:bg-terracotta disabled:opacity-40"
              >
                {placing && <span className="h-3.5 w-3.5 animate-spin rounded-full border border-ivory/40 border-t-ivory" aria-hidden />}
                {placing ? (payment === "card" ? `Taking you to ${provider === "flutterwave" ? "Flutterwave" : "Paystack"}…` : "Placing your order…") : `Place order · ${formatNaira(total)}`}
              </button>
            )}
          </div>
        </div>

        <aside className="hidden lg:block" aria-label="Order summary">
          <div className="sticky top-8">{summary}</div>
        </aside>
      </div>
    </div>
  );
}

function Progress({ step, onStep }: { step: number; onStep: (i: number) => void }) {
  return (
    <nav aria-label="Checkout progress">
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-2">
            <span className="relative block h-0.5 overflow-hidden bg-line">
              <m.span className="absolute inset-y-0 left-0 bg-ink" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.6, ease: EASE_HOUSE }} />
            </span>
            <button
              type="button"
              onClick={() => onStep(i)}
              disabled={i >= step}
              aria-current={i === step ? "step" : undefined}
              className={`label text-left transition-colors ${i === step ? "text-ink" : i < step ? "text-ink/60 hover:text-ink" : "text-ink/30"}`}
            >
              <span className="hidden sm:inline">{String(i + 1).padStart(2, "0")} </span>
              {s}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Summary({
  items,
  subtotal,
  deliveryFee,
  freeDelivery,
  pickup,
  expressFee,
  discount,
  total,
  coupon,
  couponInput,
  couponError,
  onCouponInput,
  onApply,
  onRemoveCoupon,
  gift,
}: {
  items: ReturnType<typeof useCart>["items"];
  subtotal: number;
  deliveryFee: number;
  freeDelivery: boolean;
  pickup: boolean;
  expressFee: number;
  discount: number;
  total: number;
  coupon: { code: string; discount: number } | null;
  couponInput: string;
  couponError: string | null;
  onCouponInput: (v: string) => void;
  onApply: () => void;
  onRemoveCoupon: () => void;
  gift: boolean;
}) {
  return (
    <div className="bg-bone/60 p-6">
      <p className="label text-clay">Your order</p>
      <ul className="mt-5 space-y-4">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <span className="relative h-20 w-16 shrink-0 overflow-hidden bg-bone">
              <Image src={item.product.images[0]} alt="" fill sizes="64px" className="object-cover" />
              <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center bg-ink px-1 text-[10px] text-ivory">{item.quantity}</span>
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate">{item.product.name}</span>
              <span className="block text-xs text-ink/55">{item.size} · {item.color}</span>
              <MeasurementStatus item={item} className="mt-1" />
            </span>
            <span className="text-sm">{formatNaira((item.product.price + (item.customizationCost ?? 0)) * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-ink/10 pt-5">
        {coupon ? (
          <p className="flex items-center justify-between text-sm">
            <span>
              Code <span className="font-semibold">{coupon.code}</span>
            </span>
            <button type="button" onClick={onRemoveCoupon} className="text-xs text-ink/50 underline">Remove</button>
          </p>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onApply();
            }}
          >
            <label htmlFor="checkout-promo" className="sr-only">Promo code</label>
            <input
              id="checkout-promo"
              value={couponInput}
              onChange={(e) => onCouponInput(e.target.value)}
              placeholder="Promo code"
              autoCapitalize="characters"
              aria-invalid={Boolean(couponError)}
              className="min-w-0 flex-1 border-b border-ink/20 bg-transparent py-2 text-sm uppercase outline-none placeholder:normal-case focus:border-ink"
            />
            <button type="submit" disabled={!couponInput.trim()} className="label px-2 disabled:opacity-40">Apply</button>
          </form>
        )}
        {couponError && <p role="alert" className="mt-1.5 text-xs text-error">{couponError}</p>}
      </div>

      <dl className="mt-5 space-y-2 text-sm">
        <Row label="Subtotal" value={formatNaira(subtotal)} />
        <Row label={pickup ? "Pickup" : "Delivery"} value={pickup ? (deliveryFee ? formatNaira(deliveryFee) : "Free") : freeDelivery ? "Free" : formatNaira(deliveryFee)} />
        {expressFee > 0 && <Row label="Express" value={formatNaira(expressFee)} />}
        {discount > 0 && <Row label="Discount" value={`−${formatNaira(discount)}`} />}
        {gift && <Row label="Gift wrap" value="Complimentary" />}
      </dl>
      <div className="mt-5 flex items-baseline justify-between border-t border-ink/10 pt-5">
        <span className="text-sm">Total</span>
        <span className="display text-3xl">{formatNaira(total)}</span>
      </div>
      <p className="mt-1 text-right text-[11px] text-ink/45">Final amounts are confirmed when your order is placed.</p>

      <ul className="mt-6 space-y-2 border-t border-ink/10 pt-5 text-xs text-ink/60">
        <li className="flex items-center gap-2"><TrustDot />Payments secured by Paystack</li>
        <li className="flex items-center gap-2"><TrustDot />Cut and finished in our Lagos atelier</li>
        <li className="flex items-center gap-2"><TrustDot /><Link href="/returns-policy" className="underline underline-offset-2">Returns &amp; exchanges</Link> on ready-to-wear</li>
      </ul>
    </div>
  );
}

function MobileSummary({ total, count, children }: { total: number; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="-mx-4 mb-8 border-b border-line sm:-mx-6 lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between bg-bone/60 px-4 py-4 text-sm sm:px-6"
      >
        <span>
          {open ? "Hide" : "Show"} order summary <span className="text-ink/50">({count})</span>
        </span>
        <span className="display text-xl">{formatNaira(total)}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.45, ease: EASE_HOUSE }} className="overflow-hidden">
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OptionCard({
  selected,
  onSelect,
  title,
  price,
  lines,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  price: string;
  lines: string[];
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`flex w-full gap-4 border p-5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${selected ? "border-ink bg-bone/60" : "border-line hover:border-ink/60"}`}
    >
      <span aria-hidden className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-ink" : "border-ink/30"}`}>
        {selected && <span className="h-2 w-2 rounded-full bg-ink" />}
      </span>
      <span className="flex-1">
        <span className="flex items-baseline justify-between gap-4">
          <span className="font-medium">{title}</span>
          <span className="text-sm text-ink/70">{price}</span>
        </span>
        {lines.map((l) => (
          <span key={l} className="mt-1 block text-sm text-ink/60">{l}</span>
        ))}
      </span>
    </button>
  );
}

function ReviewBlock({ title, children, onEdit, editLabel = "Edit" }: { title: string; children: React.ReactNode; onEdit: () => void; editLabel?: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-line pb-6">
      <div>
        <p className="label text-ink/50">{title}</p>
        <p className="mt-2 text-sm leading-relaxed">{children}</p>
      </div>
      <button type="button" onClick={onEdit} className="label link-line shrink-0 text-ink/60 hover:text-ink">
        {editLabel}
      </button>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  error,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  error?: string;
  hint?: string;
}) {
  const describedBy = error ? `f-${id}-error` : hint ? `f-${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={`f-${id}`} className="label text-ink/60">
        {label}
      </label>
      <input
        id={`f-${id}`}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`mt-1 w-full border-b bg-transparent py-2.5 text-base outline-none transition-colors ${error ? "border-error" : "border-line focus:border-ink"}`}
      />
      {error ? (
        <p id={`f-${id}-error`} className="mt-1.5 text-xs text-error">{error}</p>
      ) : hint ? (
        <p id={`f-${id}-hint`} className="mt-1.5 text-xs text-ink/50">{hint}</p>
      ) : null}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  autoComplete?: string;
  error?: string;
}) {
  if (options.length === 0) {
    return <Field id={id} label={label} value={value} onChange={onChange} autoComplete={autoComplete} error={error} />;
  }
  return (
    <div>
      <label htmlFor={`f-${id}`} className="label text-ink/60">{label}</label>
      <select
        id={`f-${id}`}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `f-${id}-error` : undefined}
        className={`mt-1 w-full border-b bg-transparent py-2.5 text-base outline-none ${error ? "border-error" : "border-line focus:border-ink"}`}
      >
        <option value="" disabled>Select a state</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      {error && <p id={`f-${id}-error`} className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  );
}

/** Street-address field with Google Places suggestions when the API has a
 * key configured; otherwise a plain field (browser autofill still works). */
function AddressLookup({
  value,
  error,
  onChange,
  onPick,
}: {
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onPick: (a: { address: string; city: string; state: string; postalCode: string }) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [suggestions, setSuggestions] = useState<{ id: string; label: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Google bills autocomplete per session; one token per address lookup.
  const session = useRef("");
  const typed = useRef(false);

  useEffect(() => {
    session.current = Math.random().toString(36).slice(2);
    void apiRequest<{ enabled: boolean }>("/addresses/status").then((r) => setEnabled(r.enabled)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!enabled || !typed.current || value.trim().length < 3) return;
    const id = window.setTimeout(() => {
      void apiRequest<{ suggestions: { id: string; label: string }[] }>(
        `/addresses/autocomplete?q=${encodeURIComponent(value)}&session=${session.current}`,
      )
        .then((r) => {
          setSuggestions(r.suggestions);
          setOpen(r.suggestions.length > 0);
          setActive(-1);
        })
        .catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(id);
  }, [value, enabled]);

  async function pick(s: { id: string; label: string }) {
    setOpen(false);
    typed.current = false;
    try {
      const found = await apiRequest<{ address: string; city: string; state: string; postalCode: string } | null>(
        `/addresses/details?id=${encodeURIComponent(s.id)}&session=${session.current}`,
      );
      if (found) onPick(found);
      else onChange(s.label);
    } catch {
      onChange(s.label);
    }
    session.current = Math.random().toString(36).slice(2);
  }

  return (
    <div className="relative">
      <label htmlFor="f-a.address" className="label text-ink/60">Street address</label>
      <input
        id="f-a.address"
        role={enabled ? "combobox" : undefined}
        aria-expanded={enabled ? open : undefined}
        aria-controls={enabled ? "address-suggestions" : undefined}
        aria-activedescendant={active >= 0 ? `address-option-${active}` : undefined}
        aria-autocomplete={enabled ? "list" : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "f-a.address-error" : undefined}
        autoComplete="shipping address-line1"
        value={value}
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(suggestions.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            void pick(suggestions[active]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        className={`mt-1 w-full border-b bg-transparent py-2.5 text-base outline-none transition-colors ${error ? "border-error" : "border-line focus:border-ink"}`}
      />
      {open && (
        <ul id="address-suggestions" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 border border-line bg-ivory shadow-lg">
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              id={`address-option-${i}`}
              role="option"
              aria-selected={active === i}
              onMouseDown={(e) => {
                e.preventDefault();
                void pick(s);
              }}
              className={`cursor-pointer px-4 py-3 text-sm ${active === i ? "bg-bone" : "hover:bg-bone/60"}`}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
      {error && <p id="f-a.address-error" className="mt-1.5 text-xs text-error">{error}</p>}
    </div>
  );
}

function TrustDot() {
  return <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-terracotta" />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink/60">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
