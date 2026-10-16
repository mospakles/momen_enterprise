"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { useOrders } from "@/lib/orders-context";
import { useMeasurements } from "@/lib/measurement-context";
import { useCart } from "@/lib/cart-context";
import { useAdminStore } from "@/lib/admin/store";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { formatDate, formatNaira } from "@/lib/format";
import { orderPhase, PHASES } from "@/lib/order-phases";
import type { Address, Order, Product } from "@/lib/types";
import { toast } from "@/lib/toast";
import { apiRequest } from "@/lib/api";
import { EASE_HOUSE } from "@/lib/motion/ease";
import OrderPhases from "@/components/account/OrderPhases";

const TABS = ["Overview", "My Orders", "My Measurements", "Saved Addresses", "Wishlist", "Profile", "Payment"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  Overview: "Overview",
  "My Orders": "Orders",
  "My Measurements": "Measurements",
  "Saved Addresses": "Addresses",
  Wishlist: "Wishlist",
  Profile: "Profile",
  Payment: "Payment",
};

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountContent />
    </Suspense>
  );
}

function AccountContent() {
  const { currentUser, isReady: authReady, logout } = useCustomerAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (authReady && !currentUser) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-20 sm:px-6">
        <p className="label text-clay">Your account</p>
        <h1 className="display mt-4 text-5xl">Welcome to the house.</h1>
        <p className="mt-4 text-ink/65">Follow your orders from atelier to doorstep, keep your measurements on file, and save the pieces you&rsquo;re considering.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={`/login?next=${encodeURIComponent(pathname || "/account")}`} className="bg-ink px-7 py-3.5 text-sm tracking-wide text-ivory transition-colors hover:bg-terracotta">Sign in</Link>
          <Link href={`/signup?next=${encodeURIComponent(pathname || "/account")}`} className="border border-line px-7 py-3.5 text-sm tracking-wide hover:border-ink">Create an account</Link>
        </div>
        <Link href="/account?tab=Wishlist" className="label link-line mt-10 self-start text-ink/60">Your wishlist (saved on this device)</Link>
      </div>
    );
  }

  if (!authReady || !currentUser) return <div className="mx-auto min-h-[60vh] max-w-6xl px-4 py-24" aria-busy="true" />;

  return (
    <AccountDashboard
      name={currentUser.name}
      email={currentUser.email}
      phone={currentUser.phone}
      addresses={currentUser.addresses}
      onLogout={async () => {
        await logout();
        router.push("/");
      }}
    />
  );
}

function AccountDashboard({
  name,
  email,
  phone,
  addresses,
  onLogout,
}: {
  name: string;
  email: string;
  phone?: string;
  addresses: Array<Address & { id?: string }>;
  onLogout: () => Promise<void>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requested = searchParams.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(requested ?? "") ? (requested as Tab) : "Overview";
  const setTab = (t: Tab) => router.replace(`/account?tab=${encodeURIComponent(t)}`, { scroll: false });

  const { orders, isReady: ordersReady } = useOrders();
  const { profiles } = useMeasurements();
  const { wishlist } = useCart();
  const { products } = useAdminStore();
  const { updateProfile, refreshProfile } = useCustomerAuth();
  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));
  const [profileDraft, setProfileDraft] = useState({ name, email, phone: phone ?? "" });
  const firstName = name.split(" ")[0];
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const result = await updateProfile({ name: profileDraft.name, email: profileDraft.email, phone: profileDraft.phone || undefined });
    if (result.ok) toast("Profile updated", { variant: "success" });
    else toast("Profile was not updated", { description: result.error, variant: "error" });
  }

  async function deleteAddress(id: string) {
    try {
      await apiRequest(`/auth/addresses/${encodeURIComponent(id)}`, { method: "DELETE" });
      await refreshProfile();
      toast("Address removed", { variant: "success" });
    } catch (error) {
      toast("Address was not removed", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    }
  }

  const active = orders.find((o) => orderPhase(o).index < 3 && !orderPhase(o).exception);

  return (
    <div className="mx-auto max-w-350 px-4 pb-24 pt-10 sm:px-6 lg:px-10 lg:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label text-clay">Your account</p>
          <h1 className="display mt-4 text-[clamp(2.6rem,6vw,5rem)]">{greeting}, {firstName}.</h1>
          <p className="mt-2 text-sm text-ink/55">{email}</p>
        </div>
        <button type="button" onClick={onLogout} className="label link-line text-ink/60 hover:text-ink">
          Sign out
        </button>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[200px_1fr] lg:gap-16">
        <nav aria-label="Account sections" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:border-0 lg:px-0">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-current={tab === t ? "page" : undefined}
              className={`relative whitespace-nowrap px-3 py-3 text-left text-sm transition-colors lg:px-0 lg:py-2 ${tab === t ? "text-ink" : "text-ink/50 hover:text-ink"}`}
            >
              {TAB_LABEL[t]}
              {t === "Wishlist" && wishlistProducts.length > 0 && <span className="ml-1.5 text-ink/40">{wishlistProducts.length}</span>}
              {tab === t && <m.span layoutId="account-tab" className="absolute inset-x-3 -bottom-px h-px bg-ink lg:inset-x-auto lg:-left-4 lg:bottom-auto lg:top-1/2 lg:h-px lg:w-2.5" transition={{ duration: 0.45, ease: EASE_HOUSE }} />}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <m.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE_HOUSE }}>
            {tab === "Overview" && (
              <div className="space-y-12">
                {active ? (
                  <section aria-labelledby="active-heading" className="bg-bone/60 p-6 sm:p-8">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h2 id="active-heading" className="label text-clay">In progress — {active.id}</h2>
                      <Link href={`/orders/${active.id}`} className="label link-line text-ink">Track</Link>
                    </div>
                    <p className="display mt-4 text-3xl">{PHASES[orderPhase(active).index]}{orderPhase(active).index < 3 && <span className="text-ink/40"> · arrives by {formatDate(active.estimatedDelivery)}</span>}</p>
                    <div className="mt-8">
                      <OrderPhases index={orderPhase(active).index} />
                    </div>
                  </section>
                ) : (
                  <section className="border border-line p-8">
                    <p className="display text-3xl">Nothing on the cutting table right now.</p>
                    <p className="mt-3 text-sm text-ink/60">When you order, you&rsquo;ll follow it here from cloth to doorstep.</p>
                    <Link href="/shop" className="label link-line mt-6 inline-block">Enter the collection</Link>
                  </section>
                )}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Stat label="Orders" value={ordersReady ? orders.length : "—"} onClick={() => setTab("My Orders")} />
                  <Stat label="Measurement profiles" value={profiles.length} onClick={() => setTab("My Measurements")} />
                  <Stat label="Saved pieces" value={wishlistProducts.length} onClick={() => setTab("Wishlist")} />
                </div>
              </div>
            )}

            {tab === "My Orders" && (
              <div className="space-y-5">
                {!ordersReady ? (
                  [0, 1].map((i) => <span key={i} className="shimmer block h-44 w-full" />)
                ) : orders.length === 0 ? (
                  <Empty title="No orders yet." body="Your first piece is waiting." cta="Enter the collection" href="/shop" />
                ) : (
                  orders.map((o) => <OrderCard key={o.id} order={o} products={products} />)
                )}
              </div>
            )}

            {tab === "My Measurements" && (
              <div>
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                  <p className="max-w-md text-sm text-ink/65">Saved profiles are used for made-to-measure orders. Update them any time — we&rsquo;ll always confirm before cutting.</p>
                  <Link href="/measurements" className="bg-ink px-6 py-3 text-sm text-ivory transition-colors hover:bg-terracotta">Add or edit measurements</Link>
                </div>
                {profiles.length === 0 ? (
                  <Empty title="No measurements on file." body="Measure at home with our guided steps, or book a fitting in Lagos." cta="Start measuring" href="/measurements" />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {profiles.map((p) => {
                      const entries = Object.entries(p.values).filter(([, v]) => typeof v === "number").slice(0, 6);
                      return (
                        <div key={p.id} className="border border-line p-6">
                          <div className="flex items-baseline justify-between">
                            <p className="display text-2xl">{p.label}</p>
                            <span className="text-xs text-ink/45">Updated {formatDate(p.updatedAt)}</span>
                          </div>
                          <dl className="mt-5 grid grid-cols-3 gap-y-3 text-sm">
                            {entries.map(([k, v]) => (
                              <div key={k}>
                                <dt className="label text-[0.58rem] text-ink/45">{k.replace(/([A-Z])/g, " $1")}</dt>
                                <dd className="tabular-nums">{v} {p.unit}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "Saved Addresses" &&
              (addresses.length === 0 ? (
                <Empty title="No saved addresses." body="Addresses you use at checkout can be saved here for next time." cta="Enter the collection" href="/shop" />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {addresses.map((a, i) => (
                    <div key={a.id ?? i} className="border border-line p-6 text-sm">
                      {i === 0 && <span className="label mb-3 block text-clay">Default</span>}
                      <p className="font-medium">{a.fullName}</p>
                      <p className="mt-1 text-ink/65">{a.address}{a.apartment ? `, ${a.apartment}` : ""}</p>
                      <p className="text-ink/65">{a.city}, {a.state} {a.postalCode}</p>
                      <p className="text-ink/65">{a.country}</p>
                      <p className="mt-2 text-ink/50">{a.phone}</p>
                      {a.id && (
                        <button type="button" onClick={() => deleteAddress(a.id!)} className="label link-line mt-5 text-ink/50 hover:text-error">
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}

            {tab === "Wishlist" && <WishlistPanel products={wishlistProducts} />}

            {tab === "Profile" && (
              <div className="max-w-md space-y-12">
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <ProfileField label="Full name" value={profileDraft.name} autoComplete="name" onChange={(v) => setProfileDraft((d) => ({ ...d, name: v }))} />
                  <ProfileField label="Email" value={profileDraft.email} type="email" autoComplete="email" onChange={(v) => setProfileDraft((d) => ({ ...d, email: v }))} />
                  <ProfileField label="Phone" value={profileDraft.phone} type="tel" autoComplete="tel" onChange={(v) => setProfileDraft((d) => ({ ...d, phone: v }))} />
                  <button type="submit" className="border border-ink px-6 py-3 text-sm transition-colors hover:bg-ink hover:text-ivory">Save changes</button>
                </form>
                <ChangePasswordForm />
              </div>
            )}

            {tab === "Payment" && (
              <p className="max-w-md text-sm leading-relaxed text-ink/70">
                Payment details are collected only by Paystack at checkout. momen. never sees or stores your card details.
              </p>
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function OrderCard({ order, products }: { order: Order; products: Product[] }) {
  const { addItem, addCustomItem, setItemMeasurement } = useCart();
  const { index, exception } = orderPhase(order);

  // Reorder at today's prices: lines are rebuilt from the live catalogue.
  function reorder() {
    let added = 0;
    for (const item of order.items) {
      const current = products.find((p) => p.id === item.product.id && p.publishStatus === "published");
      if (!current) continue;
      if (item.customOrder) {
        const { id: _id, ...rest } = item;
        void _id;
        addCustomItem({ ...rest, product: current });
      } else {
        const measured = item.measurement && item.measurement.mode !== "pending";
        const id = addItem(current, item.size, item.color, item.quantity, measured || item.fit === "measure" ? "measure" : "standard");
        if (item.measurement && item.measurement.mode !== "pending") setItemMeasurement(id, item.measurement);
      }
      added++;
    }
    if (added < order.items.length) toast("Some pieces are no longer available", { description: `${added} of ${order.items.length} added to your bag.` });
  }

  return (
    <article className="border border-line p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="label text-ink/50">{order.id} · {formatDate(order.date)}</p>
          <p className="display mt-2 text-2xl">{exception ?? PHASES[index]}</p>
        </div>
        <p className="display text-2xl">{formatNaira(order.total)}</p>
      </div>
      <ul className="mt-6 flex gap-2">
        {order.items.slice(0, 5).map((i) => (
          <li key={i.id} className="relative h-20 w-16 overflow-hidden bg-bone">
            {i.product.images?.[0] && <Image src={i.product.images[0]} alt={i.product.name} fill sizes="64px" className="object-cover" />}
          </li>
        ))}
        {order.items.length > 5 && <li className="flex h-20 w-16 items-center justify-center bg-bone text-xs text-ink/60">+{order.items.length - 5}</li>}
      </ul>
      {!exception && (
        <div className="mt-8">
          <OrderPhases index={index} />
        </div>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/orders/${order.id}`} className="bg-ink px-5 py-2.5 text-sm text-ivory transition-colors hover:bg-terracotta">Track order</Link>
        <button type="button" onClick={reorder} className="border border-line px-5 py-2.5 text-sm transition-colors hover:border-ink">Order again</button>
        {index === 3 && (
          <Link href={`/orders/${order.id}#returns`} className="label link-line self-center px-2 text-ink/60 hover:text-ink">Return or exchange</Link>
        )}
      </div>
    </article>
  );
}

function WishlistPanel({ products }: { products: Product[] }) {
  const { toggleWishlist } = useCart();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/wishlist?items=${products.map((p) => p.slug).join(",")}`;
    try {
      if (navigator.share) await navigator.share({ title: "My momen. wishlist", url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // share sheet dismissed
    }
  }

  if (products.length === 0) {
    return <Empty title="Nothing saved yet." body="Tap the heart on any piece to keep it here." cta="Enter the collection" href="/shop" />;
  }
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <p className="text-sm text-ink/60">{products.length} saved {products.length === 1 ? "piece" : "pieces"}</p>
        <button type="button" onClick={share} className="label link-line text-ink" aria-live="polite">
          {copied ? "Link copied" : "Share wishlist"}
        </button>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3">
        <AnimatePresence initial={false}>
          {products.map((p) => (
            <m.li key={p.id} layout exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4, ease: EASE_HOUSE }} className="group">
              <div className="relative aspect-3/4 overflow-hidden bg-bone">
                <Link href={`/product/${p.slug}`} aria-label={p.name}>
                  <Image src={p.images[0]} alt={p.name} fill sizes="(min-width:640px) 25vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                </Link>
                <button
                  type="button"
                  onClick={() => toggleWishlist(p.id)}
                  aria-label={`Remove ${p.name} from wishlist`}
                  className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-ivory/85 text-terracotta transition-transform hover:scale-110"
                >
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path d="M10 17.2s-6.7-4.1-6.7-9a3.9 3.9 0 0 1 6.7-2.7A3.9 3.9 0 0 1 16.7 8.2c0 4.9-6.7 9-6.7 9Z" />
                  </svg>
                </button>
              </div>
              <Link href={`/product/${p.slug}`} className="mt-3 block text-sm">{p.name}</Link>
              <p className="text-sm text-ink/55">{formatNaira(p.price)}</p>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function Stat({ label, value, onClick }: { label: string; value: number | string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group border border-line p-6 text-left transition-colors hover:border-ink">
      <span className="display block text-5xl">{value}</span>
      <span className="mt-2 flex items-center justify-between text-sm text-ink/55">
        {label} <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </button>
  );
}

function Empty({ title, body, cta, href }: { title: string; body: string; cta: string; href: string }) {
  return (
    <div className="border border-line p-10">
      <p className="display text-3xl">{title}</p>
      <p className="mt-3 text-sm text-ink/60">{body}</p>
      <Link href={href} className="mt-8 inline-block bg-ink px-6 py-3 text-sm text-ivory transition-colors hover:bg-terracotta">{cta}</Link>
    </div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="label text-ink/60">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border-b border-line bg-transparent py-2.5 outline-none focus:border-ink"
      />
    </label>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
      setCurrentPassword("");
      setNewPassword("");
      toast("Password updated", { description: "Please sign in again on your other devices.", variant: "success" });
    } catch (error) {
      toast("Password was not updated", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 border-t border-line pt-10">
      <p className="label text-clay">Change password</p>
      <ProfileField label="Current password" value={currentPassword} onChange={setCurrentPassword} type="password" autoComplete="current-password" />
      <ProfileField label="New password (8+ characters)" value={newPassword} onChange={setNewPassword} type="password" autoComplete="new-password" />
      <button type="submit" disabled={submitting || newPassword.length < 8} className="border border-ink px-6 py-3 text-sm transition-colors hover:bg-ink hover:text-ivory disabled:opacity-40">
        {submitting ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
