import { ReactNode } from "react";

/** Shared input look: tokens only, visible focus ring, 44px tall touch target on phones. */
export const fieldClass =
  "w-full min-h-11 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-60 sm:min-h-10";

export const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10";

export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-sm text-ink transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 sm:min-h-10";

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-critical">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>
      )}
    </div>
  );
}
