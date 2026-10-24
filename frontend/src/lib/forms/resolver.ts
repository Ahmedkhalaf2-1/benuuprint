import { zodResolver as baseResolver } from "@hookform/resolvers/zod";
import { getActive } from "@/i18n/active";

/** Recursively localises the `message` of every field error (the schemas keep their English source text). */
function localizeErrors<T>(errors: T): T {
  if (!errors || typeof errors !== "object") return errors;
  if (Array.isArray(errors)) return errors.map(localizeErrors) as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(errors as Record<string, unknown>)) {
    out[k] = k === "message" && typeof v === "string" ? getActive().t.text(v) : k === "ref" ? v : localizeErrors(v);
  }
  return out as T;
}

/**
 * Same API as `zodResolver`, but validation messages follow the active language. Schemas are module-level (English text), so
 * the translation happens when errors are produced, not when the schema is declared.
 */
export const zodResolver = ((...args: Parameters<typeof baseResolver>) => {
  const resolve = baseResolver(...args);
  return async (...call: Parameters<typeof resolve>) => {
    const result = await resolve(...call);
    return "errors" in result && result.errors ? { ...result, errors: localizeErrors(result.errors) } : result;
  };
}) as typeof baseResolver;
