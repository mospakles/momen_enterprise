"use client";

import { Suspense, useMemo, useState } from "react";
import { isMadeToMeasure } from "@/lib/product-utils";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatNaira } from "@/lib/format";
import type { Garment, Gender, Product, ProductType, PublishStatus, SizingMode } from "@/lib/types";
import { PageHeader, Card, StatusPill, Drawer, ConfirmDialog, Tabs, BulkToolbar, EmptyState } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { FilterBar, SearchInput, FilterSelect } from "@/components/admin/ui/FilterBar";
import { Field, NumberField, SelectField, TextareaField, Toggle, TagInput, CheckboxRow } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genId() {
  return `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const emptyProduct = (): Product => ({
  id: "",
  slug: "",
  name: "",
  sku: "",
  category: "",
  collectionSlugs: [],
  tags: [],
  price: 0,
  currency: "NGN",
  images: [],
  colors: [{ name: "Ivory", hex: "#F1ECDD" }],
  sizes: ["S", "M", "L"],
  productionType: "made-to-measure",
  productType: "customizable",
  gender: "men",
  sizingMode: "both",
  garment: "top",
  fabric: "",
  fabricIds: [],
  description: "",
  shortDescription: "",
  details: [],
  careInstructions: [],
  productionDays: { standard: [7, 14], express: [3, 5] },
  stock: "made-to-order",
  stockQuantity: 0,
  lowStockThreshold: 10,
  publishStatus: "draft",
  expressEligible: true,
  customization: [],
  customizable: true,
  referenceImagesAllowed: true,
  specialInstructionsAllowed: true,
  crossSellCategorySlugs: [],
  seo: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export default function AdminProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const { products, collections, categories, customizationGroups, fabrics, upsertProduct, deleteProduct, bulkUpdateProducts } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PublishStatus>("all");
  const [stockFilter, setStockFilter] = useState<"all" | Product["stock"]>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Deep-link support (e.g. from global search): open a product's editor
  // directly from ?open=<id> on first render, via lazy initializer rather
  // than an effect.
  const [editing, setEditing] = useState<Product | null>(() => {
    const openParam = searchParams.get("open");
    return openParam ? products.find((x) => x.id === openParam) ?? null : null;
  });
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !(p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (statusFilter !== "all" && p.publishStatus !== statusFilter) return false;
      if (stockFilter !== "all" && p.stock !== stockFilter) return false;
      return true;
    });
  }, [products, search, categoryFilter, statusFilter, stockFilter]);

  function upsert(p: Product) {
    const isNew = !products.some((x) => x.id === p.id);
    upsertProduct(p);
    audit(isNew ? "product.created" : "product.updated", "products", `${isNew ? "Created" : "Updated"} product "${p.name}".`, { resourceId: p.id });
    setEditing(null);
    setCreating(false);
  }

  function remove(id: string) {
    const p = products.find((x) => x.id === id);
    deleteProduct(id);
    audit("product.deleted", "products", `Deleted product "${p?.name ?? id}".`, { resourceId: id });
  }

  function bulk(patch: Partial<Product>, label: string) {
    bulkUpdateProducts([...selected], patch);
    audit("product.bulk_update", "products", `${label} ${selected.size} product(s).`, {});
    setSelected(new Set());
  }

  const columns: Column<Product>[] = [
    {
      key: "product",
      label: "Product",
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-9 shrink-0 overflow-hidden bg-ivory-deep">
            {p.images[0] && <Image src={p.images[0]} alt="" fill className="object-cover" sizes="36px" />}
          </div>
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-xs text-ink/40">{p.sku}</p>
          </div>
        </div>
      ),
      sortValue: (p) => p.name,
      csvValue: (p) => p.name,
    },
    { key: "category", label: "Category", render: (p) => p.category, sortValue: (p) => p.category, csvValue: (p) => p.category },
    {
      key: "type",
      label: "Type",
      render: (p) => (p.productType === "customizable" ? "Customizable" : p.productType === "accessory" ? "Accessory" : p.productType === "made-to-measure" ? "MTM" : "RTW"),
      sortValue: (p) => p.productType,
      csvValue: (p) => p.productType,
    },
    { key: "gender", label: "Gender", render: (p) => (p.gender === "unisex" ? "Unisex" : "Men"), sortValue: (p) => p.gender, csvValue: (p) => p.gender },
    { key: "price", label: "Price", align: "right", render: (p) => formatNaira(p.salePrice ?? p.price), sortValue: (p) => p.price, csvValue: (p) => p.price },
    { key: "stock", label: "Stock", render: (p) => <StatusPill status={p.stock} label={`${p.stock.replace(/-/g, " ")} (${p.stockQuantity})`} />, sortValue: (p) => p.stockQuantity, csvValue: (p) => p.stockQuantity },
    { key: "status", label: "Status", render: (p) => <StatusPill status={p.publishStatus} />, sortValue: (p) => p.publishStatus, csvValue: (p) => p.publishStatus },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${products.length} products in the catalog`}
        actions={can("products", "create") && <Button onClick={() => setCreating(true)}>New Product</Button>}
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or SKU…" />
        <FilterSelect ariaLabel="Category" value={categoryFilter} onChange={setCategoryFilter} options={[{ value: "all", label: "All Categories" }, ...categories.map((c) => ({ value: c.name, label: c.name }))]} />
        <FilterSelect ariaLabel="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All Statuses" }, { value: "draft", label: "Draft" }, { value: "scheduled", label: "Scheduled" }, { value: "published", label: "Published" }, { value: "archived", label: "Archived" }]} />
        <FilterSelect ariaLabel="Stock" value={stockFilter} onChange={setStockFilter} options={[{ value: "all", label: "All Stock" }, { value: "in-stock", label: "In Stock" }, { value: "low-stock", label: "Low Stock" }, { value: "made-to-order", label: "Made to Order" }, { value: "out-of-stock", label: "Out of Stock" }]} />
      </FilterBar>

      {can("products", "edit") && (
        <BulkToolbar count={selected.size} onClear={() => setSelected(new Set())}>
          <button onClick={() => bulk({ publishStatus: "published" }, "Published")} className="border border-line px-2.5 py-1 text-xs hover:border-brass">Publish</button>
          <button onClick={() => bulk({ publishStatus: "draft" }, "Unpublished")} className="border border-line px-2.5 py-1 text-xs hover:border-brass">Unpublish</button>
          <button onClick={() => bulk({ publishStatus: "archived" }, "Archived")} className="border border-line px-2.5 py-1 text-xs hover:border-brass">Archive</button>
          <button
            onClick={() => {
              selected.forEach((id) => remove(id));
              setSelected(new Set());
            }}
            className="border border-error/40 px-2.5 py-1 text-xs text-error hover:bg-error/5"
          >
            Delete
          </button>
        </BulkToolbar>
      )}

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(p) => p.id}
        emptyTitle="No products match these filters"
        pageSize={10}
        selectable={can("products", "edit")}
        selectedIds={selected}
        onSelectChange={setSelected}
        onRowClick={(p) => setEditing(p)}
      />

      {(editing || creating) && (
        <ProductDrawer
          product={editing}
          collections={collections}
          categories={categories}
          customizationGroups={customizationGroups}
          fabrics={fabrics}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={upsert}
          onDuplicate={
            editing
              ? () => {
                  const copy: Product = { ...editing, id: genId(), name: `${editing.name} (Copy)`, slug: `${editing.slug}-copy-${Date.now().toString(36)}`, sku: `${editing.sku}-COPY`, publishStatus: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
                  upsertProduct(copy);
                  audit("product.duplicated", "products", `Duplicated "${editing.name}" as "${copy.name}".`, { resourceId: copy.id });
                  setEditing(copy);
                }
              : undefined
          }
          onDelete={editing ? () => setConfirmDelete(editing.id) : undefined}
          canEdit={can("products", "edit")}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) remove(confirmDelete);
          setEditing(null);
        }}
        title="Delete this product?"
        description="This removes it from the catalog and storefront immediately. This cannot be undone."
        confirmLabel="Delete Product"
        danger
      />
    </div>
  );
}

function ProductDrawer({
  product,
  collections,
  categories,
  customizationGroups,
  fabrics,
  onCancel,
  onSave,
  onDuplicate,
  onDelete,
  canEdit,
}: {
  product: Product | null;
  collections: { slug: string; name: string }[];
  categories: { slug: string; name: string; parentId?: string }[];
  customizationGroups: { id: string; name: string }[];
  fabrics: { id: string; name: string; category: string }[];
  onCancel: () => void;
  onSave: (p: Product) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  canEdit: boolean;
}) {
  const { measurementFieldDefs, sizeOptions } = useAdminStore();
  const [form, setForm] = useState<Product>(product ?? emptyProduct());
  const [tab, setTab] = useState("details");
  const defaultFields = measurementFieldDefs
    .filter((d) => d.garments.includes(form.garment))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((d) => d.key);
  const activeFields = form.measurementFieldKeys?.length ? form.measurementFieldKeys : defaultFields;

  function set<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    const withId = form.id
      ? { ...form, updatedAt: new Date().toISOString() }
      : {
          ...form,
          id: genId(),
          slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `product-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
    onSave(withId);
  }

  return (
    <Drawer open onClose={onCancel} title={product ? `Edit — ${product.name}` : "New Product"} wide>
      <Tabs
        tabs={[
          { key: "details", label: "Details" },
          { key: "media", label: "Media" },
          { key: "customization", label: "Customization" },
          { key: "measurements", label: "Measurements" },
          { key: "seo", label: "SEO & Publishing" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-5 space-y-4">
        {tab === "details" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product Name" required value={form.name} onChange={(v) => set("name", v)} />
              <Field label="SKU" required value={form.sku} onChange={(v) => set("sku", v)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="URL Slug" value={form.slug} onChange={(v) => set("slug", v)} placeholder="auto-generated from name if left blank" />
              <SelectField label="Category" value={form.category} onChange={(v) => set("category", v)} options={categories.map((c) => ({ value: c.name, label: c.name }))} />
            </div>
            <TagInput label="Collections (type a collection name to assign)" values={form.collectionSlugs.map((s) => collections.find((c) => c.slug === s)?.name ?? s)} onChange={(names) => set("collectionSlugs", names.map((n) => collections.find((c) => c.name === n)?.slug ?? n).filter((s) => collections.some((c) => c.slug === s)))} placeholder="e.g. Signature Collection" />
            <TagInput label="Tags" values={form.tags} onChange={(v) => set("tags", v)} />

            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField label="Price (₦)" value={form.price} onChange={(v) => set("price", v)} min={0} />
              <NumberField label="Sale Price (₦, optional)" value={form.salePrice ?? 0} onChange={(v) => set("salePrice", v || undefined)} min={0} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField<ProductType>
                label="Product Type"
                value={form.productType}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    productType: v,
                    productionType: v === "accessory" ? "ready-to-wear" : v === "ready-to-wear" ? "ready-to-wear" : "made-to-measure",
                    customizable: v === "customizable",
                  }))
                }
                options={[
                  { value: "ready-to-wear", label: "Ready-to-Wear" },
                  { value: "made-to-measure", label: "Made-to-Measure" },
                  { value: "customizable", label: "Customizable (full MTM wizard)" },
                  { value: "accessory", label: "Accessory" },
                ]}
              />
              <SelectField<Gender> label="Gender" value={form.gender} onChange={(v) => set("gender", v)} options={[{ value: "men", label: "Men" }, { value: "unisex", label: "Unisex" }]} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField<Garment>
                label="Garment / Measurement Family"
                value={form.garment}
                onChange={(v) => set("garment", v)}
                options={[
                  { value: "top", label: "Top (shirt, kaftan, jalabia, casual)" },
                  { value: "trouser", label: "Trouser / Pants" },
                  { value: "set", label: "Two-Piece Set" },
                  { value: "agbada", label: "Agbada" },
                  { value: "accessory", label: "Accessory (no measurements)" },
                ]}
              />
              <SelectField<SizingMode> label="Sizing Mode" value={form.sizingMode} onChange={(v) => set("sizingMode", v)} options={[{ value: "standard", label: "Standard Sizes Only" }, { value: "made-to-measure", label: "Made-to-Measure Only" }, { value: "both", label: "Standard or Made-to-Measure" }, { value: "one-size", label: "One Size" }]} />
            </div>

            <Field label="Fabric (display text)" value={form.fabric} onChange={(v) => set("fabric", v)} hint="Free-text summary shown on the product page — assign selectable fabrics under the Customization tab." />
            <TextareaField label="Short Description" value={form.shortDescription ?? ""} onChange={(v) => set("shortDescription", v)} rows={2} />
            <TextareaField label="Full Description" value={form.description} onChange={(v) => set("description", v)} rows={4} />
            <TagInput label="Product Details (bullet points)" values={form.details} onChange={(v) => set("details", v)} />
            <TagInput label="Care Instructions" values={form.careInstructions} onChange={(v) => set("careInstructions", v)} />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink/60">Sizes</span>
              <div className="flex flex-wrap gap-x-4 gap-y-2 border border-line px-3 py-2.5">
                {[...sizeOptions].filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder).map((s) => (
                  <CheckboxRow
                    key={s.id}
                    label={s.label}
                    checked={form.sizes.includes(s.label)}
                    onChange={(checked) => set("sizes", checked ? [...form.sizes, s.label] : form.sizes.filter((x) => x !== s.label))}
                  />
                ))}
              </div>
              <TagInput
                label="Other sizes (free text — shoe sizes, numeric waists, One Size)"
                values={form.sizes.filter((s) => !sizeOptions.some((o) => o.label === s))}
                onChange={(others) => set("sizes", [...form.sizes.filter((s) => sizeOptions.some((o) => o.label === s)), ...others])}
              />
            </div>
            <TextareaField
              label="Size Chart (optional)"
              value={form.sizeChart ?? ""}
              onChange={(v) => set("sizeChart", v || undefined)}
              rows={4}
              hint="Shown to customers as a size guide on the product page. Plain text or simple HTML."
            />

            <Card>
              <p className="eyebrow mb-3">Inventory</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <SelectField label="Stock Status" value={form.stock} onChange={(v) => set("stock", v)} options={[{ value: "in-stock", label: "In Stock" }, { value: "low-stock", label: "Low Stock" }, { value: "made-to-order", label: "Made to Order" }, { value: "out-of-stock", label: "Out of Stock" }]} />
                <NumberField label="Stock Quantity" value={form.stockQuantity} onChange={(v) => set("stockQuantity", v)} min={0} />
                <NumberField label="Low Stock Threshold" value={form.lowStockThreshold} onChange={(v) => set("lowStockThreshold", v)} min={0} />
              </div>
              {form.sizes.length > 1 && (
                <div className="mt-5 border-t border-line pt-4">
                  <Toggle
                    label="Track stock per size"
                    hint="When on, each size has its own count and the product total becomes their sum. Sold-out sizes show 'Notify me' on the storefront."
                    checked={Object.keys(form.sizeInventory ?? {}).length > 0}
                    onChange={(on) =>
                      set(
                        "sizeInventory",
                        on ? Object.fromEntries(form.sizes.map((size) => [size, 0])) : {},
                      )
                    }
                  />
                  {Object.keys(form.sizeInventory ?? {}).length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                      {form.sizes.map((size) => (
                        <NumberField
                          key={size}
                          label={size}
                          min={0}
                          value={form.sizeInventory?.[size] ?? 0}
                          onChange={(v) => set("sizeInventory", { ...(form.sizeInventory ?? {}), [size]: v })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card>
              <p className="eyebrow mb-3">Production Timeline (business days)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex gap-2">
                  <NumberField label="Standard Min" value={form.productionDays.standard[0]} onChange={(v) => set("productionDays", { ...form.productionDays, standard: [v, form.productionDays.standard[1]] })} />
                  <NumberField label="Standard Max" value={form.productionDays.standard[1]} onChange={(v) => set("productionDays", { ...form.productionDays, standard: [form.productionDays.standard[0], v] })} />
                </div>
                <div className="flex gap-2">
                  <NumberField label="Express Min" value={form.productionDays.express[0]} onChange={(v) => set("productionDays", { ...form.productionDays, express: [v, form.productionDays.express[1]] })} />
                  <NumberField label="Express Max" value={form.productionDays.express[1]} onChange={(v) => set("productionDays", { ...form.productionDays, express: [form.productionDays.express[0], v] })} />
                </div>
              </div>
              <div className="mt-3">
                <Toggle label="Eligible for Express production" checked={form.expressEligible} onChange={(v) => set("expressEligible", v)} />
              </div>
            </Card>
          </>
        )}

        {tab === "media" && (
          <>
            <p className="text-xs text-ink/45">Paste image URLs, or upload via the Media Library and copy the URL here.</p>
            <TagInput label="Image URLs" values={form.images} onChange={(v) => set("images", v)} placeholder="https://…" />
            <TagInput label="Video URLs (optional)" values={form.videos ?? []} onChange={(v) => set("videos", v)} placeholder="https://…" />
            <TagInput
              label="360° frames (optional, in rotation order — 24–36 shots work best)"
              values={form.spinImages ?? []}
              onChange={(v) => set("spinImages", v)}
              placeholder="https://…"
            />
            {form.colors.length > 1 && (
              <Card>
                <p className="eyebrow mb-1">Photos per colour</p>
                <p className="mb-3 text-xs text-ink/50">Selecting a colour on the product page swaps the gallery to these. Leave empty to use the main images.</p>
                <div className="space-y-4">
                  {form.colors.map((color, i) => (
                    <div key={color.name} className="flex gap-3">
                      <span className="mt-6 h-5 w-5 shrink-0 rounded-full border border-line" style={{ backgroundColor: color.hex }} />
                      <div className="flex-1">
                        <TagInput
                          label={color.name}
                          values={color.images ?? []}
                          onChange={(v) => set("colors", form.colors.map((c, j) => (j === i ? { ...c, images: v } : c)))}
                          placeholder="https://…"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {form.images[0] && (
              <div className="relative h-56 w-40 overflow-hidden bg-ivory-deep">
                <Image src={form.images[0]} alt="" fill className="object-cover" sizes="160px" />
              </div>
            )}
          </>
        )}

        {tab === "customization" && (
          <>
            <Card>
              <p className="eyebrow mb-3">Made-to-Measure Wizard</p>
              <Toggle
                label="Customizable (full design → customize → measure wizard)"
                hint="When on, customers reach this product through the advanced Made-to-Measure experience instead of a simple add-to-bag."
                checked={form.customizable}
                onChange={(v) => set("customizable", v)}
              />
              <Toggle label="Allow reference image uploads" checked={form.referenceImagesAllowed} onChange={(v) => set("referenceImagesAllowed", v)} />
              <Toggle label="Allow special instructions" checked={form.specialInstructionsAllowed} onChange={(v) => set("specialInstructionsAllowed", v)} />
            </Card>

            <Card>
              <p className="eyebrow mb-3">Available Fabrics</p>
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {fabrics.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 border-b border-line py-1.5 text-sm last:border-0">
                    <input
                      type="checkbox"
                      checked={(form.fabricIds ?? []).includes(f.id)}
                      onChange={(e) => {
                        const list = form.fabricIds ?? [];
                        set("fabricIds", e.target.checked ? [...list, f.id] : list.filter((x) => x !== f.id));
                      }}
                      className="accent-brass"
                    />
                    {f.name} <span className="text-ink/35">— {f.category}</span>
                  </label>
                ))}
              </div>
            </Card>

            <TagInput
              label='"Complete the Look" categories (accessories to suggest)'
              values={(form.crossSellCategorySlugs ?? []).map((s) => categories.find((c) => c.slug === s)?.name ?? s)}
              onChange={(names) =>
                set(
                  "crossSellCategorySlugs",
                  names.map((n) => categories.find((c) => c.name === n)?.slug ?? n).filter((s) => categories.some((c) => c.slug === s))
                )
              }
              placeholder="e.g. Footwear, Belts, Caps"
            />

            <p className="text-xs text-ink/45">Enable the style customization groups a customer can choose (colour, fabric, sleeve, collar, embroidery, monogram…).</p>
            <div className="space-y-2">
              {customizationGroups.map((g) => {
                const entry = form.customization.find((c) => c.groupId === g.id);
                return (
                  <Card key={g.id} className="flex items-center justify-between !p-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(entry?.enabled)}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          const next = form.customization.filter((c) => c.groupId !== g.id);
                          set("customization", [...next, { groupId: g.id, enabled, required: entry?.required ?? false }]);
                        }}
                        className="accent-brass"
                      />
                      <span className="text-sm">{g.name}</span>
                    </div>
                    {entry?.enabled && (
                      <CheckboxRow
                        label="Required"
                        checked={entry.required}
                        onChange={(req) => set("customization", form.customization.map((c) => (c.groupId === g.id ? { ...c, required: req } : c)))}
                      />
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {tab === "measurements" && (
          <>
            <p className="text-xs text-ink/45">
              By default, required measurements come from the garment type ({form.garment}). Override which fields apply to this specific product below.
            </p>
            {!isMadeToMeasure(form) ? (
              <EmptyState title="Not a made-to-measure product" description="Measurement fields only apply to made-to-measure items." />
            ) : (
              <div className="space-y-1.5">
                {defaultFields.map((key) => (
                  <label key={key} className="flex items-center gap-2 border-b border-line py-1.5 text-sm last:border-0">
                    <input
                      type="checkbox"
                      checked={activeFields.includes(key)}
                      onChange={(e) => {
                        const next = e.target.checked ? [...activeFields, key] : activeFields.filter((k) => k !== key);
                        set("measurementFieldKeys", next);
                      }}
                      className="accent-brass"
                    />
                    {key}
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "seo" && (
          <>
            <Card>
              <p className="eyebrow mb-3">Publishing</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField<PublishStatus> label="Status" value={form.publishStatus} onChange={(v) => set("publishStatus", v)} options={[{ value: "draft", label: "Draft" }, { value: "scheduled", label: "Scheduled" }, { value: "published", label: "Published" }, { value: "archived", label: "Archived" }]} />
                {form.publishStatus === "scheduled" && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs text-ink/60">Publish Date</span>
                    <input type="datetime-local" value={form.publishAt?.slice(0, 16) ?? ""} onChange={(e) => set("publishAt", new Date(e.target.value).toISOString())} className="border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass" />
                  </label>
                )}
              </div>
            </Card>
            <Field label="SEO Title" value={form.seo.title ?? ""} onChange={(v) => set("seo", { ...form.seo, title: v })} />
            <TextareaField label="Meta Description" value={form.seo.description ?? ""} onChange={(v) => set("seo", { ...form.seo, description: v })} rows={2} />
            <Field label="Canonical URL" value={form.seo.canonicalUrl ?? ""} onChange={(v) => set("seo", { ...form.seo, canonicalUrl: v })} />
            <Field label="Open Graph Image URL" value={form.seo.ogImage ?? ""} onChange={(v) => set("seo", { ...form.seo, ogImage: v })} />
            <Toggle label="No-index this page" checked={Boolean(form.seo.noIndex)} onChange={(v) => set("seo", { ...form.seo, noIndex: v })} />
          </>
        )}
      </div>

      {canEdit && (
        <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
          <Button onClick={handleSave}>Save Product</Button>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          {onDuplicate && (
            <button onClick={onDuplicate} className="ml-auto text-xs text-clay hover:text-brass">
              Duplicate
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="text-xs text-ink/40 hover:text-error">
              Delete
            </button>
          )}
        </div>
      )}
    </Drawer>
  );
}
