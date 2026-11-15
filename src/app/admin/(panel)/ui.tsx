"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/form";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/** Form that runs a server action and shows the success / error message. */
export function ActionForm({
  action,
  children,
  submitLabel = "שמירה",
  className,
  extraButtons,
  resetOnSuccess,
}: {
  action: Action;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  extraButtons?: ReactNode;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className ?? "form-section"}>
      {children}
      <div className="form-bar">
        <SubmitButton label={submitLabel} />
        {extraButtons}
        <span role="status" aria-live="polite">
          {state?.error && <span className="form-error">{state.error}</span>}
          {state?.ok && <span className="form-ok">{state.message ?? "נשמר בהצלחה"}</span>}
        </span>
      </div>
    </form>
  );
}

export function SubmitButton({ label = "שמירה", className = "btn btn-primary" }: { label?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "שומר..." : label}
    </button>
  );
}

/** Small form for a single dangerous action (delete) with a confirmation prompt. */
export function ConfirmButton({
  action,
  label,
  confirmText,
  hidden,
}: {
  action: (fd: FormData) => Promise<void>;
  label: string;
  confirmText: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" className="btn btn-danger">
        {label}
      </button>
    </form>
  );
}
