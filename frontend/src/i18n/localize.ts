/** Keys whose string values are identifiers/links/tokens, never display text. */
export const NON_DISPLAY_KEYS = new Set(["kind", "href", "visualKey", "status", "phase", "id", "key", "number", "imageSrc", "src", "value"]);
export function localizeDeep<T>(data: T, text: (s: string) => string, key?: string): T {
  if (typeof data === "string") return (key && NON_DISPLAY_KEYS.has(key) ? data : text(data)) as T;
  if (Array.isArray(data)) return data.map((d) => localizeDeep(d, text, key)) as T;
  if (data && typeof data === "object") return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, localizeDeep(v, text, k)])) as T;
  return data;
}

