import type { MetadataRoute } from "next";
import { buildSitemap } from "@/features/public-site/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap();
}
