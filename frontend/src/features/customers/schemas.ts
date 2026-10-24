import { z } from "zod";
import { ADDRESS_TYPES, CONTACT_ROLES, CUSTOMER_STATUSES } from "./types";

/**
 * Frontend validation is UX only; the backend (class-validator + normalisation) is authoritative.
 * Phone / email normalisation is deliberately NOT duplicated here.
 */
const optional = (max: number) => z.string().trim().max(max, `At most ${max} characters`);
const optionalEmail = z.string().trim().max(254).refine((v) => v === "" || /^\S+@\S+\.\S+$/.test(v), "Enter a valid email address");

export const customerSchema = z.object({
  displayName: z.string().trim().min(2, "Enter at least 2 characters").max(120, "At most 120 characters"),
  email: optionalEmail,
  phone: optional(40),
  whatsapp: optional(40),
  country: optional(80),
  city: optional(80),
  instagram: optional(60),
  source: optional(80),
  notes: optional(2000),
  status: z.enum(CUSTOMER_STATUSES),
});
export type CustomerFormValues = z.infer<typeof customerSchema>;
export const CUSTOMER_FIELDS = Object.keys(customerSchema.shape);

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(120),
  role: z.enum(CONTACT_ROLES),
  jobTitle: optional(120),
  email: optionalEmail,
  phone: optional(40),
  whatsapp: optional(40),
  notes: optional(1000),
  isPrimary: z.boolean(),
});
export type ContactFormValues = z.infer<typeof contactSchema>;
export const CONTACT_FIELDS = Object.keys(contactSchema.shape);

export const addressSchema = z.object({
  type: z.enum(ADDRESS_TYPES),
  country: z.string().trim().min(1, "Enter a country").max(80),
  state: optional(80),
  city: z.string().trim().min(1, "Enter a city").max(80),
  area: optional(80),
  addressLine1: z.string().trim().min(2, "Enter at least 2 characters").max(200),
  addressLine2: optional(200),
  postalCode: optional(20),
  notes: optional(1000),
  isDefault: z.boolean(),
});
export type AddressFormValues = z.infer<typeof addressSchema>;
export const ADDRESS_FIELDS = Object.keys(addressSchema.shape);

/** Create: drop empty optionals (the API treats absent as "not provided"). */
export function omitEmpty<T extends Record<string, unknown>>(values: T): Partial<T> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== "")) as Partial<T>;
}

/** Update: empty optional strings become null (the API's way to clear a field). */
export function emptyToNull<T extends Record<string, unknown>>(values: T, requiredKeys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === "" && !requiredKeys.includes(k) ? null : v]));
}
