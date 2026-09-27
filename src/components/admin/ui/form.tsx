"use client";

import { useState } from "react";

const inputCls = "w-full border border-line bg-ivory px-3 py-2.5 text-sm outline-none focus:border-brass";

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-ink/60">
        {label}
        {required && <span className="text-error"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} disabled:opacity-50`}
      />
      {hint && <span className="text-[11px] text-ink/40">{hint}</span>}
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  min?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-ink/60">{label}</span>
      <input
        type="number"
        min={min}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={inputCls}
      />
      {hint && <span className="text-[11px] text-ink/40">{hint}</span>}
    </label>
  );
}

export function TextareaField({
  label,
  value,
  onChange,
  rows = 4,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-ink/60">{label}</span>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      {hint && <span className="text-[11px] text-ink/40">{hint}</span>}
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-ink/60">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="text-[11px] text-ink/40">{hint}</span>}
    </label>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-center justify-between gap-4 py-1">
      <span>
        <span className="block text-sm text-ink">{label}</span>
        {hint && <span className="block text-[11px] text-ink/40">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-brass" : "bg-line"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-ivory transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export function TagInput({ label, values, onChange, placeholder = "Add and press Enter" }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  function commit() {
    if (draft.trim() && !values.includes(draft.trim())) onChange([...values, draft.trim()]);
    setDraft("");
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-ink/60">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 border border-line px-2 py-1 text-xs">
            {v}
            <button onClick={() => onChange(values.filter((x) => x !== v))} className="text-ink/40 hover:text-error">
              ✕
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

export function CheckboxRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-brass" />
      {label}
    </label>
  );
}
