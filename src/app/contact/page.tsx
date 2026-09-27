"use client";

import { FormEvent, useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", topic: "Order Inquiry", message: "" });
  const [sending, setSending] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setForm({ name: "", email: "", topic: "Order Inquiry", message: "" });
      toast("Message sent", { description: "We'll reply within 1–2 business days.", variant: "success" });
    }, 700);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p className="eyebrow">Contact</p>
      <h1 className="mt-2 font-display text-4xl">Get in Touch</h1>
      <p className="mt-3 max-w-md text-ink/70">
        Questions about an order, a measurement, or a custom piece — our team replies within 1–2
        business days.
      </p>

      <div className="mt-12 grid gap-12 sm:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6 text-sm">
          <div>
            <p className="eyebrow mb-1">Email</p>
            <p className="text-ink/70">hello@momen.style</p>
          </div>
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
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
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
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-ink/60">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass"
      />
    </label>
  );
}
