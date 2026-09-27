"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { MediaAsset } from "@/lib/admin/types";
import { PageHeader, Modal, EmptyState, ConfirmDialog } from "@/components/admin/ui/primitives";
import { FilterBar, SearchInput, FilterSelect } from "@/components/admin/ui/FilterBar";
import { Field } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

const MAX_UPLOAD_BYTES = 1.8 * 1024 * 1024;

export default function AdminMediaPage() {
  const { mediaAssets, addMediaAsset, deleteMediaAsset } = useAdminStore();
  const { currentUser, can } = useAdminAuth();
  const audit = useAudit();
  const fileInput = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("all");
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const folders = useMemo(() => Array.from(new Set(mediaAssets.map((m) => m.folder))).sort(), [mediaAssets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mediaAssets.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      if (folderFilter !== "all" && m.folder !== folderFilter) return false;
      return true;
    });
  }, [mediaAssets, search, folderFilter]);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast("Unsupported file", { description: `${file.name} is not an image.`, variant: "error" });
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        toast("File too large", { description: `${file.name} exceeds the 1.8MB demo upload limit — use "Add by URL" for larger assets.`, variant: "error" });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        addMediaAsset({
          name: file.name,
          url: String(reader.result),
          type: "image",
          folder: "Uploads",
          size: file.size,
          uploadedBy: currentUser?.name ?? "Admin",
        });
        audit("media.uploaded", "content", `Uploaded "${file.name}" to the media library.`, {});
        toast("Uploaded", { description: file.name, variant: "success" });
      };
      reader.readAsDataURL(file);
    });
  }

  return (
    <div>
      <PageHeader
        title="Media Library"
        description="Drag and drop images, or add by URL for hosted assets. Copy a URL to reuse it anywhere in the dashboard."
        actions={
          can("content", "create") && (
            <>
              <Button variant="secondary" onClick={() => setUrlModalOpen(true)}>Add by URL</Button>
              <Button onClick={() => fileInput.current?.click()}>Upload</Button>
              <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
            </>
          )
        }
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search file name…" />
        <FilterSelect ariaLabel="Folder" value={folderFilter} onChange={setFolderFilter} options={[{ value: "all", label: "All Folders" }, ...folders.map((f) => ({ value: f, label: f }))]} />
      </FilterBar>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`mb-5 border-2 border-dashed p-6 text-center text-sm transition-colors ${dragOver ? "border-brass bg-brass/5 text-brass" : "border-line text-ink/40"}`}
      >
        Drag and drop images here, or use the Upload button above.
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No media found" description="Upload an image or adjust your filters." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((m) => (
            <button key={m.id} onClick={() => setSelected(m)} className="group text-left">
              <div className="relative aspect-square overflow-hidden border border-line bg-ivory-deep">
                <Image src={m.url} alt={m.alt ?? m.name} fill className="object-cover transition-transform group-hover:scale-105" sizes="200px" unoptimized />
              </div>
              <p className="mt-1.5 truncate text-xs text-ink/60">{m.name}</p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Modal open onClose={() => setSelected(null)} title={selected.name}>
          <div className="relative mb-4 aspect-video overflow-hidden bg-ivory-deep">
            <Image src={selected.url} alt={selected.alt ?? selected.name} fill className="object-contain" unoptimized />
          </div>
          <div className="space-y-1.5 text-xs text-ink/60">
            <p>Folder: {selected.folder}</p>
            <p>Size: {(selected.size / 1024).toFixed(0)} KB</p>
            <p>Uploaded: {formatDate(selected.uploadedAt)} by {selected.uploadedBy}</p>
          </div>
          <Field
            label="URL"
            value={selected.url.startsWith("data:") ? "(inline uploaded image)" : selected.url}
            onChange={() => {}}
          />
          <div className="mt-4 flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                if (!selected.url.startsWith("data:")) {
                  navigator.clipboard?.writeText(selected.url);
                  toast("URL copied");
                }
              }}
            >
              Copy URL
            </Button>
            {can("content", "delete") && (
              <button onClick={() => setConfirmDelete(selected.id)} className="ml-auto text-xs text-error hover:underline">
                Delete
              </button>
            )}
          </div>
        </Modal>
      )}

      {urlModalOpen && (
        <AddByUrlModal
          onCancel={() => setUrlModalOpen(false)}
          onAdd={(name, url, folder) => {
            addMediaAsset({ name, url, type: "image", folder: folder || "Uploads", size: 0, uploadedBy: currentUser?.name ?? "Admin" });
            audit("media.uploaded", "content", `Added "${name}" to the media library by URL.`, {});
            setUrlModalOpen(false);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            deleteMediaAsset(confirmDelete);
            audit("media.deleted", "content", "Deleted a media asset.", { resourceId: confirmDelete });
          }
          setSelected(null);
        }}
        title="Delete this asset?"
        description="If it's referenced elsewhere (product images, banners), those references will break."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function AddByUrlModal({ onCancel, onAdd }: { onCancel: () => void; onAdd: (name: string, url: string, folder: string) => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [folder, setFolder] = useState("Uploads");
  return (
    <Modal open onClose={onCancel} title="Add Media by URL">
      <div className="space-y-4">
        <Field label="File Name" value={name} onChange={setName} />
        <Field label="Image URL" required value={url} onChange={setUrl} placeholder="https://…" />
        <Field label="Folder" value={folder} onChange={setFolder} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onAdd(name || "Untitled", url, folder)} disabled={!url}>Add to Library</Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Modal>
  );
}
