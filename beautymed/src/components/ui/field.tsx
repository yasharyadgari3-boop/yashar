"use client";

import { useFieldError } from "./action-form";
import type { ComponentProps, ReactNode } from "react";

const inputClass =
  "block min-h-11 w-full rounded-sm border border-muted bg-bg px-3 py-2 text-base text-ink placeholder:text-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-ink";

type FieldShell = { label: ReactNode; name: string; error?: string; hint?: ReactNode; required?: boolean };

function Shell({ label, name, error, hint, required, children }: FieldShell & { children: ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-base text-ink">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`${name}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${name}-error`} role="alert" className="mt-1.5 text-sm font-medium text-ink">
          خطا: {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(name: string, error?: string, hint?: ReactNode): string | undefined {
  const ids = [hint ? `${name}-hint` : null, error ? `${name}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function Field({
  label,
  name,
  error: errorProp,
  hint,
  required,
  ...props
}: FieldShell & Omit<ComponentProps<"input">, "name" | "id" | "className">) {
  const ctxError = useFieldError(name);
  const error = errorProp ?? ctxError;
  return (
    <Shell label={label} name={name} error={error} hint={hint} required={required}>
      <input
        id={name}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={inputClass}
        {...props}
      />
    </Shell>
  );
}

export function TextArea({
  label,
  name,
  error: errorProp,
  hint,
  required,
  rows = 4,
  ...props
}: FieldShell & Omit<ComponentProps<"textarea">, "name" | "id" | "className">) {
  const ctxError = useFieldError(name);
  const error = errorProp ?? ctxError;
  return (
    <Shell label={label} name={name} error={error} hint={hint} required={required}>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={inputClass}
        {...props}
      />
    </Shell>
  );
}

export function Select({
  label,
  name,
  error: errorProp,
  hint,
  required,
  children,
  ...props
}: FieldShell & Omit<ComponentProps<"select">, "name" | "id" | "className">) {
  const ctxError = useFieldError(name);
  const error = errorProp ?? ctxError;
  return (
    <Shell label={label} name={name} error={error} hint={hint} required={required}>
      <select
        id={name}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={inputClass}
        {...props}
      >
        {children}
      </select>
    </Shell>
  );
}

export function Checkbox({
  label,
  name,
  error: errorProp,
  ...props
}: { label: ReactNode; name: string; error?: string } & Omit<ComponentProps<"input">, "name" | "id" | "type" | "className">) {
  const ctxError = useFieldError(name);
  const error = errorProp ?? ctxError;
  return (
    <div>
      <label htmlFor={name} className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-base text-ink">
        <input
          id={name}
          name={name}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className="mt-1.5 size-5 shrink-0 accent-ink"
          {...props}
        />
        <span>{label}</span>
      </label>
      {error ? (
        <p id={`${name}-error`} role="alert" className="mt-1 text-sm font-medium text-ink">
          خطا: {error}
        </p>
      ) : null}
    </div>
  );
}
