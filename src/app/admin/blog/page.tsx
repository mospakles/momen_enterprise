"use client";

import { useState } from "react";
import { useAdminStore } from "@/lib/admin/store";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAudit } from "@/lib/admin/use-audit";
import { formatDate } from "@/lib/format";
import type { PublishStatus } from "@/lib/types";
import type { BlogPost } from "@/lib/admin/types";
import { PageHeader, StatusPill, Drawer, ConfirmDialog } from "@/components/admin/ui/primitives";
import { DataTable, Column } from "@/components/admin/ui/DataTable";
import { Field, TextareaField, SelectField, TagInput } from "@/components/admin/ui/form";
import { Button } from "@/components/ui/Button";

function genId() {
  return `bp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function AdminBlogPage() {
  const { blogPosts, upsertBlogPost, deleteBlogPost } = useAdminStore();
  const { can } = useAdminAuth();
  const audit = useAudit();
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function save(p: BlogPost) {
    const isNew = !blogPosts.some((x) => x.id === p.id);
    upsertBlogPost({ ...p, updatedAt: new Date().toISOString() });
    audit(isNew ? "blog_post.created" : "blog_post.updated", "content", `${isNew ? "Published" : "Updated"} journal post "${p.title}".`, { resourceId: p.id });
    setEditing(null);
    setCreating(false);
  }

  const columns: Column<BlogPost>[] = [
    { key: "title", label: "Post", render: (p) => <div><p className="font-medium">{p.title}</p><p className="text-xs text-ink/40">by {p.author}</p></div>, sortValue: (p) => p.title, csvValue: (p) => p.title },
    { key: "tags", label: "Tags", render: (p) => p.tags.join(", "), csvValue: (p) => p.tags.join(", ") },
    { key: "status", label: "Status", render: (p) => <StatusPill status={p.status} />, sortValue: (p) => p.status, csvValue: (p) => p.status },
    { key: "updated", label: "Updated", render: (p) => formatDate(p.updatedAt), sortValue: (p) => p.updatedAt, csvValue: (p) => formatDate(p.updatedAt) },
  ];

  return (
    <div>
      <PageHeader title="Blog / Journal" description="Editorial content for the Momen journal." actions={can("content", "create") && <Button onClick={() => setCreating(true)}>New Post</Button>} />

      <DataTable columns={columns} rows={blogPosts} getRowId={(p) => p.id} pageSize={10} onRowClick={(p) => setEditing(p)} />

      {(editing || creating) && (
        <PostDrawer post={editing} onCancel={() => { setEditing(null); setCreating(false); }} onSave={save} onDelete={editing ? () => setConfirmDelete(editing.id) : undefined} />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            const p = blogPosts.find((x) => x.id === confirmDelete);
            deleteBlogPost(confirmDelete);
            audit("blog_post.deleted", "content", `Deleted journal post "${p?.title}".`, { resourceId: confirmDelete });
          }
          setEditing(null);
        }}
        title="Delete this post?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

function PostDrawer({ post, onCancel, onSave, onDelete }: { post: BlogPost | null; onCancel: () => void; onSave: (p: BlogPost) => void; onDelete?: () => void }) {
  const [form, setForm] = useState<BlogPost>(
    post ?? { id: "", slug: "", title: "", excerpt: "", body: "", coverImage: "https://picsum.photos/seed/new-journal/1600/1000", author: "", status: "draft", tags: [], seo: {}, updatedAt: new Date().toISOString() }
  );
  function set<K extends keyof BlogPost>(key: K, value: BlogPost[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  return (
    <Drawer open onClose={onCancel} title={post ? `Edit — ${post.title}` : "New Post"} wide>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required value={form.title} onChange={(v) => set("title", v)} />
          <Field label="Slug" value={form.slug} onChange={(v) => set("slug", v)} placeholder="auto-generated if blank" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Author" value={form.author} onChange={(v) => set("author", v)} />
          <Field label="Cover Image URL" value={form.coverImage} onChange={(v) => set("coverImage", v)} />
        </div>
        <TextareaField label="Excerpt" value={form.excerpt} onChange={(v) => set("excerpt", v)} rows={2} />
        <TextareaField label="Body" value={form.body} onChange={(v) => set("body", v)} rows={8} />
        <TagInput label="Tags" values={form.tags} onChange={(v) => set("tags", v)} />
        <SelectField<PublishStatus> label="Status" value={form.status} onChange={(v) => set("status", v)} options={[{ value: "draft", label: "Draft" }, { value: "scheduled", label: "Scheduled" }, { value: "published", label: "Published" }, { value: "archived", label: "Archived" }]} />
        <Field label="SEO Title" value={form.seo.title ?? ""} onChange={(v) => set("seo", { ...form.seo, title: v })} />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onSave(form.id ? form : { ...form, id: genId(), slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} disabled={!form.title}>
          Save Post
        </Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        {onDelete && <button onClick={onDelete} className="ml-auto text-xs text-ink/40 hover:text-error">Delete</button>}
      </div>
    </Drawer>
  );
}
