"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOrders } from "@/lib/orders-context";
import { useMeasurements } from "@/lib/measurement-context";
import { useCart } from "@/lib/cart-context";
import { useAdminStore } from "@/lib/admin/store";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { formatDate, formatNaira } from "@/lib/format";
import type { Address } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { toast } from "@/lib/toast";
import { apiRequest } from "@/lib/api";

const TABS = ["Overview", "My Orders", "My Measurements", "Saved Addresses", "Wishlist", "Profile", "Payment"] as const;

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
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <p className="eyebrow text-clay">Account</p>
        <h1 className="mt-2 font-display text-3xl">Sign in to view your account</h1>
        <p className="mt-3 text-sm text-ink/60">
          Track orders, save measurement profiles, manage your wishlist, and check out faster.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button href={`/login?next=${encodeURIComponent(pathname || "/account")}`}>Sign In</Button>
          <Button href={`/signup?next=${encodeURIComponent(pathname || "/account")}`} variant="secondary">
            Create Account
          </Button>
        </div>
      </div>
    );
  }

  if (!authReady || !currentUser) return <div className="mx-auto max-w-6xl px-4 py-24" />;

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
  const [tab, setTab] = useState<(typeof TABS)[number]>(() => {
    const requested = searchParams.get("tab");
    return (TABS as readonly string[]).includes(requested ?? "") ? (requested as (typeof TABS)[number]) : "Overview";
  });
  const { orders, isReady: ordersReady } = useOrders();
  const { profiles } = useMeasurements();
  const { wishlist } = useCart();
  const { products } = useAdminStore();
  const { updateProfile, refreshProfile } = useCustomerAuth();

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  const [profileDraft, setProfileDraft] = useState({ name, email, phone: phone ?? "" });

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
      toast("Address deleted", { variant: "success" });
    } catch (error) {
      toast("Address was not deleted", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">{name}</h1>
          <p className="mt-1 text-sm text-ink/50">{email}</p>
        </div>
        <button onClick={onLogout} className="eyebrow border border-line px-4 py-2 text-ink/70 hover:border-ink hover:text-ink">
          Log Out
        </button>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[200px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap px-3 py-2 text-left text-sm lg:px-0 ${
                tab === t ? "font-medium text-brass" : "text-ink/60 hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        <div>
          {tab === "Overview" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Orders" value={ordersReady ? orders.length : "—"} />
              <StatCard label="Measurement Profiles" value={profiles.length} />
              <StatCard label="Wishlist Items" value={wishlistProducts.length} />
              <div className="sm:col-span-3">
                <p className="eyebrow mb-3">Recent Orders</p>
                {orders.slice(0, 3).length === 0 ? (
                  <p className="text-sm text-ink/60">No orders yet.</p>
                ) : (
                  <div className="space-y-2">
                    {orders.slice(0, 3).map((o) => (
                      <Link key={o.id} href={`/orders/${o.id}`} className="flex justify-between border border-line px-4 py-3 text-sm hover:border-brass">
                        <span>{o.id} · {formatDate(o.date)}</span>
                        <span>{formatNaira(o.total)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "My Orders" && (
            <div className="space-y-3">
              {orders.length === 0 ? (
                <EmptyState label="No orders yet" cta="Start Shopping" href="/shop" />
              ) : (
                orders.map((o) => (
                  <Link key={o.id} href={`/orders/${o.id}`} className="block border border-line p-5 hover:border-brass">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{o.id}</p>
                      <span className="eyebrow text-clay">{o.timeline.filter((t) => t.complete).slice(-1)[0]?.stage}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink/50">{formatDate(o.date)} · {o.items.length} item(s)</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <p className="text-ink/70">{o.productionSpeed === "express" ? "Express" : "Standard"} production</p>
                      <p className="font-display text-lg">{formatNaira(o.total)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {tab === "My Measurements" && (
            <div>
              <p className="mb-4 text-sm text-ink/70">
                Manage your saved measurement profiles from the{" "}
                <Link href="/measurements" className="underline text-brass">
                  Measurements page
                </Link>
                .
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {profiles.map((p) => (
                  <div key={p.id} className="border border-line p-4">
                    <p className="font-medium">{p.label}</p>
                    <p className="mt-1 text-xs text-ink/50">Updated {formatDate(p.updatedAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "Saved Addresses" && (
            addresses.length === 0 ? (
              <EmptyState label="No saved addresses yet" cta="Add one at checkout" href="/checkout" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((a, i) => (
                  <div key={i} className="border border-line p-4 text-sm">
                    <p className="font-medium">{a.fullName}</p>
                    <p className="mt-1 text-ink/60">
                      {a.address}
                      {a.apartment ? `, ${a.apartment}` : ""}
                    </p>
                    <p className="text-ink/60">{a.city}, {a.state} {a.postalCode}</p>
                    <p className="text-ink/60">{a.country}</p>
                    <p className="mt-1 text-ink/50">{a.phone}</p>
                    {a.id && (
                      <button onClick={() => deleteAddress(a.id!)} className="mt-3 text-xs text-error hover:underline">
                        Delete address
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "Wishlist" && (
            <div>
              {wishlistProducts.length === 0 ? (
                <EmptyState label="Your wishlist is empty" cta="Browse the Shop" href="/shop" />
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {wishlistProducts.map((p) => (
                    <Link key={p.id} href={`/product/${p.slug}`} className="group">
                      <div className="relative aspect-[4/5] overflow-hidden bg-ivory-deep">
                        <Image src={p.images[0]} alt={p.name} fill className="object-cover transition-transform group-hover:scale-105" />
                      </div>
                      <p className="mt-2 text-sm">{p.name}</p>
                      <p className="text-xs text-ink/60">{formatNaira(p.price)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "Profile" && (
            <div className="max-w-sm space-y-8">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <ProfileField label="Full Name" value={profileDraft.name} onChange={(v) => setProfileDraft((d) => ({ ...d, name: v }))} />
                <ProfileField label="Email" value={profileDraft.email} onChange={(v) => setProfileDraft((d) => ({ ...d, email: v }))} type="email" />
                <ProfileField label="Phone" value={profileDraft.phone} onChange={(v) => setProfileDraft((d) => ({ ...d, phone: v }))} type="tel" />
                <Button type="submit" variant="secondary">Save Changes</Button>
              </form>
              <ChangePasswordForm />
            </div>
          )}

          {tab === "Payment" && (
            <div>
              <p className="text-sm text-ink/70">Payment details are collected only by the selected payment provider at checkout. Momen does not store card details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-line p-5">
      <p className="font-display text-3xl">{value}</p>
      <p className="mt-1 text-xs text-ink/50">{label}</p>
    </div>
  );
}

function EmptyState({ label, cta, href }: { label: string; cta: string; href: string }) {
  return (
    <div className="border border-dashed border-line py-16 text-center">
      <p className="text-ink/70">{label}</p>
      <Button href={href} className="mt-5">
        {cta}
      </Button>
    </div>
  );
}

function ProfileField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-ink/60">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
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
    <form onSubmit={submit} className="border-t border-line pt-6 space-y-4">
      <p className="eyebrow">Change Password</p>
      <ProfileField label="Current Password" value={currentPassword} onChange={setCurrentPassword} type="password" />
      <ProfileField label="New Password" value={newPassword} onChange={setNewPassword} type="password" />
      <Button type="submit" variant="secondary" disabled={submitting || newPassword.length < 8}>
        {submitting ? "Updating…" : "Update Password"}
      </Button>
    </form>
  );
}
