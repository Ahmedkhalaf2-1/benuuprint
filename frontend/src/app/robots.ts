import type { MetadataRoute } from "next";
import { buildRobots } from "@/features/public-site/seo";

export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
