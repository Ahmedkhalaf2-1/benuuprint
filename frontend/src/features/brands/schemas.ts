import { z } from "zod";
import { BRAND_EDITABLE_STATUSES } from "./types";

const hex = z.string().trim().refine((v) => v === "" || /^#[0-9a-fA-F]{6}$/.test(v), "Use a hex colour like #1A2B3C");

export const brandSchema = z.object({
  name: z.string().trim().min(1, "Enter a brand name").max(120, "At most 120 characters"),
  instagram: z.string().trim().max(60),
  website: z.string().trim().max(300).refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Use an http(s) address"),
  description: z.string().trim().max(2000),
  primaryColor: hex,
  secondaryColor: hex,
  status: z.enum(BRAND_EDITABLE_STATUSES),
});
export type BrandFormValues = z.infer<typeof brandSchema>;
export const BRAND_FIELDS = Object.keys(brandSchema.shape);
