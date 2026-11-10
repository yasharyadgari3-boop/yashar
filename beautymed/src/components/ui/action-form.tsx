"use client";

import { createContext, useActionState, useContext, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "./button";

export type FormState = {
  ok?: boolean;
  /** Message shown at the top of the form (success or general error). */
  message?: string;
  /** Per-field error messages, keyed by input name. */
  errors?: Record<string, string>;
};

const FormStateContext = createContext<FormState>({});

/** Field-level errors for inputs rendered inside an ActionForm. */
export function useFieldError(name: string): string | undefined {
  return useContext(FormStateContext).errors?.[name];
}

/**
 * A form bound to a Server Action that returns a FormState. Shows the general message in a
 * live region and exposes field errors to its children.
 */
export function ActionForm({
  action,
  children,
  className = "",
  hideOnSuccess = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  /** Replace the fields with the success message once the action succeeds. */
  hideOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const done = hideOnSuccess && state.ok;
  return (
    <form action={formAction} noValidate className={className}>
      <div aria-live="polite">
        {state.message ? (
          <p
            role={state.ok ? "status" : "alert"}
            className={`mb-5 border px-4 py-3 text-base text-ink ${state.ok ? "border-line bg-alt" : "border-2 border-ink bg-bg"}`}
          >
            {state.ok ? null : "خطا: "}
            {state.message}
          </p>
        ) : null}
      </div>
      {done ? null : <FormStateContext.Provider value={state}>{children}</FormStateContext.Provider>}
    </form>
  );
}

export function SubmitButton({
  children,
  pendingLabel = "در حال ارسال…",
  variant = "primary",
  className,
  name,
  value,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} name={name} value={value} className={buttonClass(variant, "light", className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}
