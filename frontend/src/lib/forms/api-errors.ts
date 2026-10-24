import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiError } from "@/lib/api/errors";

export interface MappedFormError {
  /** Message(s) that could not be attached to a field. */
  formMessage: string | null;
  requestId?: string;
}

/**
 * Maps a backend error to react-hook-form fields.
 * - 400 (class-validator): each message is "<field> <problem>"; the leading property name selects the field.
 * - 409 conflicts: attached to `conflictField` when given (e.g. duplicate brand name -> `name`), otherwise form-level.
 * Anything left over is returned as `formMessage`. Backend stays authoritative; this is display only.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
  opts: { conflictField?: string } = {},
): MappedFormError {
  if (!isApiError(error)) return { formMessage: "Unexpected error. Please try again." };
  const rest: string[] = [];
  if (error.kind === "validation") {
    for (const m of error.messages) {
      const field = m.split(" ")[0] ?? "";
      if (fields.includes(field)) {
        setError(field as Path<T>, { type: "server", message: capitalize(m.slice(field.length).trim()) || m });
      } else rest.push(m);
    }
  } else if (error.kind === "conflict" && opts.conflictField && fields.includes(opts.conflictField)) {
    setError(opts.conflictField as Path<T>, { type: "server", message: error.message });
  } else {
    rest.push(error.kind === "rate_limited" && error.retryAfter ? `Too many requests. Try again in ${error.retryAfter}s.` : error.message);
  }
  return { formMessage: rest.length ? rest.join(" ") : null, requestId: error.requestId };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
