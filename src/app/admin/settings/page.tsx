"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatNaira } from "@/lib/format";
import type { SystemSettings } from "@/lib/admin/types";
import { PageHeader, Card, SectionTitle, Tabs } from "@/components/admin/ui/primitives";
import { Field, NumberField, TagInput, Toggle } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";
import { toast } from "@/lib/toast";
import { apiRequest } from "@/lib/api";

const TABS = [
  { key: "general", label: "General" },
  { key: "currency", label: "Currency" },
  { key: "tax", label: "Tax" },
  { key: "checkout", label: "Checkout" },
  { key: "production", label: "Production & Delivery" },
  { key: "notifications", label: "Notifications" },
  { key: "integrations", label: "Integrations" },
];

export default function AdminSettingsPage() {
  const { systemSettings, setSystemSettings, deliveryZones } = useAdminStore();
  const activeZones = deliveryZones.filter((z) => z.active);
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [tab, setTab] = useState("general");
  const [form, setForm] = useState<SystemSettings>(systemSettings);
  const canEdit = can("settings", "edit");

  useEffect(() => setForm(systemSettings), [systemSettings]);

  async function save() {
    try {
      const saved = await apiRequest<SystemSettings>("/admin/settings", { method: "PUT", body: { value: form } });
      setSystemSettings(saved);
      audit("settings.updated", "settings", `Updated ${TABS.find((t) => t.key === tab)?.label} settings.`, {});
      toast("Settings saved", { variant: "success" });
    } catch (error) {
      toast("Settings were not saved", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Centralized configuration for the Momen platform." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="mt-6 max-w-2xl">
        {tab === "general" && (
          <Card>
            <SectionTitle>Brand</SectionTitle>
            <div className="space-y-4">
              <Field label="Brand Name" value={form.general.brandName} onChange={(v) => setForm({ ...form, general: { ...form.general, brandName: v } })} disabled={!canEdit} />
              <Field label="Logo URL" value={form.general.logoUrl} onChange={(v) => setForm({ ...form, general: { ...form.general, logoUrl: v } })} disabled={!canEdit} />
              <Field label="Favicon URL" value={form.general.faviconUrl} onChange={(v) => setForm({ ...form, general: { ...form.general, faviconUrl: v } })} disabled={!canEdit} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Support Email" value={form.general.supportEmail} onChange={(v) => setForm({ ...form, general: { ...form.general, supportEmail: v } })} disabled={!canEdit} />
                <Field label="Support Phone" value={form.general.supportPhone} onChange={(v) => setForm({ ...form, general: { ...form.general, supportPhone: v } })} disabled={!canEdit} />
              </div>
              <Field label="Instagram URL" value={form.general.instagram} onChange={(v) => setForm({ ...form, general: { ...form.general, instagram: v } })} disabled={!canEdit} />
              <Field label="TikTok URL" value={form.general.tiktok} onChange={(v) => setForm({ ...form, general: { ...form.general, tiktok: v } })} disabled={!canEdit} />
              <Field label="Pinterest URL" value={form.general.pinterest} onChange={(v) => setForm({ ...form, general: { ...form.general, pinterest: v } })} disabled={!canEdit} />
            </div>
          </Card>
        )}

        {tab === "currency" && (
          <Card>
            <SectionTitle>Currency</SectionTitle>
            <div className="space-y-4">
              <Field label="Default Currency" value={form.currency.defaultCurrency} onChange={() => {}} disabled />
              <TagInput label="Supported Currencies" values={form.currency.supportedCurrencies} onChange={(v) => setForm({ ...form, currency: { ...form.currency, supportedCurrencies: v } })} />
            </div>
          </Card>
        )}

        {tab === "tax" && (
          <Card>
            <SectionTitle>Tax</SectionTitle>
            <div className="space-y-4">
              <Toggle label="Prices are tax-inclusive" checked={form.tax.taxInclusive} onChange={(v) => setForm({ ...form, tax: { ...form.tax, taxInclusive: v } })} />
              <NumberField label="Default Tax Rate (%)" value={form.tax.defaultRatePct} onChange={(v) => setForm({ ...form, tax: { ...form.tax, defaultRatePct: v } })} />
              <div>
                <p className="mb-2 text-xs text-ink/60">Regional Rates</p>
                <div className="space-y-2">
                  {form.tax.regions.map((r, i) => (
                    <div key={r.region} className="flex items-center gap-2">
                      <span className="flex-1 text-sm">{r.region}</span>
                      <input
                        type="number"
                        value={r.ratePct}
                        onChange={(e) => {
                          const regions = [...form.tax.regions];
                          regions[i] = { ...r, ratePct: Number(e.target.value) || 0 };
                          setForm({ ...form, tax: { ...form.tax, regions } });
                        }}
                        className="w-24 border border-line bg-ivory px-2 py-1.5 text-sm outline-none focus:border-brass"
                      />
                      <span className="text-xs text-ink/40">%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {tab === "checkout" && (
          <Card>
            <SectionTitle>Checkout</SectionTitle>
            <div className="space-y-4">
              <Toggle label="Allow guest checkout" checked={form.checkout.guestCheckoutEnabled} onChange={(v) => setForm({ ...form, checkout: { ...form.checkout, guestCheckoutEnabled: v } })} />
              <NumberField label="Minimum Order Value (₦)" value={form.checkout.minimumOrderValue} onChange={(v) => setForm({ ...form, checkout: { ...form.checkout, minimumOrderValue: v } })} />
              <NumberField label="Require Account Above (₦, 0 = never)" value={form.checkout.accountRequiredAboveValue ?? 0} onChange={(v) => setForm({ ...form, checkout: { ...form.checkout, accountRequiredAboveValue: v || undefined } })} />
            </div>
          </Card>
        )}

        {tab === "production" && (
          <Card>
            <SectionTitle>Production &amp; Delivery</SectionTitle>
            <p className="text-xs text-ink/55">What checkout charges right now, from your active delivery zones.</p>
            {activeZones.length === 0 ? (
              <p className="mt-4 bg-error/5 p-4 text-sm text-error">
                No active delivery zone — checkout can&apos;t quote delivery yet.{" "}
                <Link href="/admin/delivery" className="underline">Add a zone</Link>
              </p>
            ) : (
              <div className="mt-4 divide-y divide-line border-y border-line">
                {activeZones.map((z) => (
                  <dl key={z.id} className="grid gap-x-6 gap-y-1.5 py-4 text-sm sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-ink">{z.name}</dt>
                      <dd className="text-xs text-ink/55">{z.countries.join(", ") || "No countries assigned"}</dd>
                    </div>
                    <ZoneRow label="Standard" value={`${z.standardDays[0]}–${z.standardDays[1]} business days · ${formatNaira(z.standardFee)}`} />
                    <ZoneRow label="Express" value={z.expressAvailable ? `${z.expressDays[0]}–${z.expressDays[1]} business days · +${formatNaira(z.expressFee)}` : "Not offered"} />
                    <ZoneRow label="Free delivery" value={z.freeDeliveryThreshold !== undefined ? `On orders over ${formatNaira(z.freeDeliveryThreshold)}` : "Not offered"} />
                    <ZoneRow label="Pickup" value={z.pickupAvailable ? `${z.pickupLocation || "Available"} · ${z.pickupFee ? formatNaira(z.pickupFee) : "free"}` : "Not offered"} />
                  </dl>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs text-ink/45">
              Full timeline rules, per-zone delivery fees, and express eligibility are managed on the{" "}
              <Link href="/admin/production" className="text-brass hover:underline">Production</Link> and{" "}
              <Link href="/admin/delivery" className="text-brass hover:underline">Delivery</Link> pages.
            </p>
          </Card>
        )}

        {tab === "notifications" && (
          <Card>
            <SectionTitle>Notification Settings</SectionTitle>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email From Name" value={form.notifications.emailFromName} onChange={(v) => setForm({ ...form, notifications: { ...form.notifications, emailFromName: v } })} disabled={!canEdit} />
                <Field label="Email From Address" value={form.notifications.emailFromAddress} onChange={(v) => setForm({ ...form, notifications: { ...form.notifications, emailFromAddress: v } })} disabled={!canEdit} />
              </div>
              <Toggle label="SMS notifications enabled" checked={form.notifications.smsEnabled} onChange={(v) => setForm({ ...form, notifications: { ...form.notifications, smsEnabled: v } })} />
              {form.notifications.smsEnabled && (
                <Field label="SMS Provider" value={form.notifications.smsProvider ?? ""} onChange={(v) => setForm({ ...form, notifications: { ...form.notifications, smsProvider: v } })} disabled={!canEdit} />
              )}
              <p className="text-xs text-ink/45">
                Event-level triggers (order placed, shipped, etc.) are managed on the{" "}
                <Link href="/admin/notifications" className="text-brass hover:underline">Notifications</Link> page.
              </p>
            </div>
          </Card>
        )}

        {tab === "integrations" && (
          <Card>
            <SectionTitle>Integrations</SectionTitle>
            <div className="space-y-4">
              <Field label="Analytics Provider" value={form.integrations.analyticsProvider} onChange={(v) => setForm({ ...form, integrations: { ...form.integrations, analyticsProvider: v } })} disabled={!canEdit} />
              <Field label="Email Provider" value={form.integrations.emailProvider} onChange={(v) => setForm({ ...form, integrations: { ...form.integrations, emailProvider: v } })} disabled={!canEdit} />
              <Field label="Shipping Provider" value={form.integrations.shippingProvider} onChange={(v) => setForm({ ...form, integrations: { ...form.integrations, shippingProvider: v } })} disabled={!canEdit} />
              <Field label="Cloud Storage Provider" value={form.integrations.cloudStorageProvider} onChange={(v) => setForm({ ...form, integrations: { ...form.integrations, cloudStorageProvider: v } })} disabled={!canEdit} />
              <p className="text-xs text-ink/45">
                Payment provider credentials are managed on the{" "}
                <Link href="/admin/payments" className="text-brass hover:underline">Payments</Link> page.
              </p>
            </div>
          </Card>
        )}

        {canEdit && tab !== "production" && (
          <Button className="mt-5" onClick={save}>Save Changes</Button>
        )}
      </div>
    </div>
  );
}

function ZoneRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-ink/50">{label}</dt>
      <dd className="text-ink/80">{value}</dd>
    </div>
  );
}
