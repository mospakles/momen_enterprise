"use client";

import { FormEvent, useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { apiRequest } from "@/lib/api";
import { useAdminStore } from "@/lib/admin/store";
import PhotoBanner from "@/components/campaign/PhotoBanner";
import { shots } from "@/lib/campaign-shots";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", topic: "Order Inquiry", message: "" });
  const [sending, setSending] = useState(false);
  const { systemSettings } = useAdminStore();
  const email = systemSettings.general.supportEmail || "hello@momenclothing.com";
  const phone = systemSettings.general.supportPhone ?? "";
  const whatsapp = phone.replace(/[^\d]/g, "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await apiRequest("/contact", { method: "POST", body: form });
      setSending(false);
      setForm({ name: "", email: "", topic: "Order Inquiry", message: "" });
      toast("Message sent", { description: "We'll reply within 1–2 business days.", variant: "success" });
    } catch (error) {
      setSending(false);
      toast("Message not sent", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    }
  }

  return (
    <>
      <PhotoBanner shot={shots("cobalt-trousers-duo-side")[0]} eyebrow="Contact" title="Get in Touch">Questions about an order, a measurement, or a custom piece — our team replies within 1–2 business days.</PhotoBanner>
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-4 sm:px-6">

      <div className="mt-12 grid gap-12 sm:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6 text-sm">
          <div>
            <p className="eyebrow mb-1">Email</p>
            <a href={`mailto:${email}`} className="link-line text-ink/70 hover:text-ink">{email}</a>
          </div>
          {whatsapp && (
            <div>
              <p className="eyebrow mb-1">Phone &amp; WhatsApp</p>
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="link-line text-ink/70 hover:text-ink">{phone}</a>
            </div>
          )}
          <div>
            <p className="eyebrow mb-1">Atelier</p>
            <p className="text-ink/70">Lagos, Nigeria</p>
          </div>
          <div>
            <p className="eyebrow mb-1">Hours</p>
            <p className="text-ink/70">Mon–Fri, 9am–5pm WAT</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" autoComplete="name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ink/60">Topic</span>
            <select
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
            >
              <option>Order Inquiry</option>
              <option>Made-to-Measure Question</option>
              <option>Returns &amp; Exchanges</option>
              <option>Wholesale</option>
              <option>Other</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ink/60">Message</span>
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
            />
          </label>
          <Button type="submit" disabled={sending}>
            {sending ? "Sending…" : "Send Message"}
          </Button>
        </form>
      </div>
    </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-ink/60">{label}</span>
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
      />
    </label>
  );
}
