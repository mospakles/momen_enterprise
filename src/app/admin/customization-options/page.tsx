"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatNaira } from "@/lib/format";
import type { CustomizationChoice, CustomizationGroup } from "@/lib/types";
import { PageHeader, Card, StatusPill, Modal, EmptyState, ConfirmDialog } from "@/components/admin/ui/primitives";
import { Field, NumberField, TextareaField, Toggle } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genGroupId() {
  return `cg-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
function genChoiceId() {
  return `ch-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminCustomizationOptionsPage() {
  const { customizationGroups, upsertCustomizationGroup, deleteCustomizationGroup } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editingGroup, setEditingGroup] = useState<CustomizationGroup | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(customizationGroups[0]?.id ?? null);

  function saveGroup(g: CustomizationGroup) {
    const isNew = !customizationGroups.some((x) => x.id === g.id);
    upsertCustomizationGroup(g);
    audit(isNew ? "customization_group.created" : "customization_group.updated", "products", `${isNew ? "Added" : "Updated"} customization group "${g.name}".`, { resourceId: g.id });
    setEditingGroup(null);
    setCreatingGroup(false);
  }

  return (
    <div>
      <PageHeader
        title="Customization Options"
        description="Style-level choices — sleeve, collar, embroidery, monogram, and any new option group — that products offer in the Made-to-Measure customization wizard. Add, edit, or retire options here without touching code. Colour and Fabric have their own dedicated libraries."
        actions={can("products", "create") && <Button onClick={() => setCreatingGroup(true)}>New Option Group</Button>}
      />

      {customizationGroups.length === 0 ? (
        <EmptyState title="No customization option groups yet" />
      ) : (
        <div className="space-y-3">
          {customizationGroups.map((g) => (
            <Card key={g.id} className="!p-0 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left"
              >
                <div>
                  <p className="font-medium">{g.name}</p>
                  {g.description && <p className="mt-0.5 text-xs text-ink/45">{g.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <StatusPill status="active" label={`${g.choices.length} choice${g.choices.length === 1 ? "" : "s"}`} />
                  <span className="text-ink/40">{expanded === g.id ? "▲" : "▼"}</span>
                </div>
              </button>

              {expanded === g.id && (
                <div className="border-t border-line p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
                    <button
                      onClick={() => setEditingGroup(g)}
                      className="text-xs text-clay hover:text-brass"
                    >
                      Edit group
                    </button>
                    <button onClick={() => setConfirmDelete(g.id)} className="text-xs text-ink/40 hover:text-error">
                      Delete group
                    </button>
                  </div>

                  {g.choices.length === 0 ? (
                    <p className="text-sm text-ink/45">No choices yet — edit the group to add one.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line text-left text-xs text-ink/50">
                          <th className="pb-2 font-normal">Choice</th>
                          <th className="pb-2 font-normal">Additional cost</th>
                          <th className="pb-2 font-normal">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...g.choices].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => (
                          <tr key={c.id} className="border-b border-line last:border-0">
                            <td className="py-2">
                              <p>{c.label}</p>
                              {c.description && <p className="text-xs text-ink/40">{c.description}</p>}
                            </td>
                            <td className="py-2">{c.additionalCost > 0 ? `+${formatNaira(c.additionalCost)}` : "Included"}</td>
                            <td className="py-2"><StatusPill status={c.available ? "active" : "disabled"} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {(editingGroup || creatingGroup) && (
        <GroupModal
          group={editingGroup}
          onCancel={() => { setEditingGroup(null); setCreatingGroup(false); }}
          onSave={saveGroup}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            const g = customizationGroups.find((x) => x.id === confirmDelete);
            deleteCustomizationGroup(confirmDelete);
            audit("customization_group.deleted", "products", `Deleted customization group "${g?.name}".`, { resourceId: confirmDelete });
          }
        }}
        title="Delete this option group?"
        description="Products offering this group will no longer show it as a customization step."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function GroupModal({ group, onCancel, onSave }: { group: CustomizationGroup | null; onCancel: () => void; onSave: (g: CustomizationGroup) => void }) {
  const [form, setForm] = useState<CustomizationGroup>(group ?? { id: "", name: "", description: "", choices: [] });

  function set<K extends keyof CustomizationGroup>(key: K, value: CustomizationGroup[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addChoice() {
    const choice: CustomizationChoice = {
      id: genChoiceId(),
      label: "",
      additionalCost: 0,
      available: true,
      sortOrder: form.choices.length,
    };
    set("choices", [...form.choices, choice]);
  }
  function updateChoice(id: string, patch: Partial<CustomizationChoice>) {
    set("choices", form.choices.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeChoice(id: string) {
    set("choices", form.choices.filter((c) => c.id !== id));
  }

  return (
    <Modal open onClose={onCancel} title={group ? `Edit — ${group.name}` : "New Option Group"} size="lg">
      <div className="space-y-4">
        <Field label="Name" required value={form.name} onChange={(v) => set("name", v)} hint="e.g. Sleeve Style, Collar / Neckline, Embroidery" />
        <TextareaField label="Description" value={form.description ?? ""} onChange={(v) => set("description", v)} rows={2} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-ink/60">Choices</span>
            <button onClick={addChoice} className="text-xs text-clay hover:text-brass">+ Add choice</button>
          </div>
          {form.choices.length === 0 ? (
            <p className="border border-dashed border-line px-3 py-4 text-center text-xs text-ink/40">No choices yet.</p>
          ) : (
            <div className="space-y-3">
              {form.choices.map((c) => (
                <div key={c.id} className="border border-line p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Field label="Label" value={c.label} onChange={(v) => updateChoice(c.id, { label: v })} />
                    <NumberField label="Additional cost (₦)" value={c.additionalCost} onChange={(v) => updateChoice(c.id, { additionalCost: v })} min={0} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <Toggle label="Available" checked={c.available} onChange={(v) => updateChoice(c.id, { available: v })} />
                    <button onClick={() => removeChoice(c.id)} className="text-xs text-ink/40 hover:text-error">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form.id ? form : { ...form, id: genGroupId() })} disabled={!form.name}>Save Group</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Modal>
  );
}
