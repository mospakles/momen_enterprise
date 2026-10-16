"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import type { HomepageSection } from "@/lib/admin/types";
import { PageHeader, Card, Modal, Badge } from "@/components/admin/ui/primitives";
import { Field, SelectField, TextareaField } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";
import { apiRequest } from "@/lib/api";
import { toast } from "@/lib/toast";

const FIELD_LABELS: Record<string, string> = {
  headline: "Headline",
  subheading: "Subheading",
  ctaLabel: "Primary CTA Label",
  ctaHref: "Primary CTA Link",
  ctaLabel2: "Secondary CTA Label",
  ctaHref2: "Secondary CTA Link",
  image: "Image URL",
  bannerId: "Banner",
};

export default function AdminHomepagePage() {
  const { homepageSections, setHomepageSections, banners } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<HomepageSection | null>(null);

  const sorted = [...homepageSections].sort((a, b) => a.sortOrder - b.sortOrder);

  async function move(id: string, dir: -1 | 1) {
    const idx = sorted.findIndex((s) => s.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const orderedIds = [...sorted.map((section) => section.id)];
    [orderedIds[idx], orderedIds[swapIdx]] = [orderedIds[swapIdx], orderedIds[idx]];
    try {
      setHomepageSections(await apiRequest<HomepageSection[]>("/admin/homepage-sections/reorder", { method: "PATCH", body: { orderedIds } }));
    } catch (error) {
      toast("Homepage order was not saved", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    }
  }

  async function toggleVisible(id: string) {
    const s = homepageSections.find((x) => x.id === id);
    if (!s) return;
    try {
      const saved = await apiRequest<HomepageSection>(`/admin/homepage-sections/${encodeURIComponent(id)}`, { method: "PUT", body: { ...s, visible: !s.visible } });
      setHomepageSections((prev) => prev.map((section) => section.id === id ? saved : section));
      audit("homepage.section_toggled", "content", `${s.visible ? "Hid" : "Showed"} homepage section "${s.label}".`, { resourceId: id });
    } catch (error) {
      toast("Homepage section was not saved", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    }
  }

  async function save(section: HomepageSection) {
    try {
      const saved = await apiRequest<HomepageSection>(`/admin/homepage-sections/${encodeURIComponent(section.id)}`, { method: "PUT", body: section });
      setHomepageSections((prev) => prev.map((s) => (s.id === section.id ? saved : s)));
      audit("homepage.section_updated", "content", `Updated homepage section "${section.label}".`, { resourceId: section.id });
      setEditing(null);
    } catch (error) {
      toast("Homepage section was not saved", { description: error instanceof Error ? error.message : "Please try again.", variant: "error" });
    }
  }

  return (
    <div>
      <PageHeader title="Homepage" description="Reorder, hide, and edit the sections that make up the storefront homepage. Changes apply immediately." />

      <div className="space-y-3">
        {sorted.map((s, i) => (
          <Card key={s.id} className={!s.visible ? "opacity-50" : ""}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="eyebrow text-ink/30">#{i + 1}</span>
                <div>
                  <p className="font-medium">{s.label}</p>
                  <p className="text-xs text-ink/40">{s.content.headline || s.content.bannerId || "—"}</p>
                </div>
                {!s.visible && <Badge>Hidden</Badge>}
              </div>
              {can("content", "edit") && (
                <div className="flex items-center gap-2 text-xs">
                  <button onClick={() => move(s.id, -1)} disabled={i === 0} className="border border-line px-2 py-1 hover:border-brass disabled:opacity-30">↑</button>
                  <button onClick={() => move(s.id, 1)} disabled={i === sorted.length - 1} className="border border-line px-2 py-1 hover:border-brass disabled:opacity-30">↓</button>
                  <button onClick={() => toggleVisible(s.id)} className="border border-line px-2.5 py-1 hover:border-brass">{s.visible ? "Hide" : "Show"}</button>
                  <button onClick={() => setEditing(s)} className="border border-line px-2.5 py-1 hover:border-brass">Edit</button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {editing && <SectionModal section={editing} banners={banners} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function SectionModal({
  section,
  banners,
  onCancel,
  onSave,
}: {
  section: HomepageSection;
  banners: { id: string; title: string }[];
  onCancel: () => void;
  onSave: (s: HomepageSection) => void;
}) {
  const [form, setForm] = useState<HomepageSection>(section);

  function setContent(key: string, value: string) {
    setForm((f) => ({ ...f, content: { ...f.content, [key]: value } }));
  }

  return (
    <Modal open onClose={onCancel} title={`Edit — ${section.label}`}>
      <div className="space-y-4">
        {Object.entries(form.content).map(([key, value]) =>
          key === "bannerId" ? (
            <SelectField key={key} label="Banner" value={value} onChange={(v) => setContent(key, v)} options={banners.map((b) => ({ value: b.id, label: b.title }))} />
          ) : key === "subheading" ? (
            <TextareaField key={key} label={FIELD_LABELS[key] ?? key} value={value} onChange={(v) => setContent(key, v)} rows={2} />
          ) : (
            <Field key={key} label={FIELD_LABELS[key] ?? key} value={value} onChange={(v) => setContent(key, v)} />
          )
        )}
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form)}>Save Section</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Modal>
  );
}
