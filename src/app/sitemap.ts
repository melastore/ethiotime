import type { MetadataRoute } from "next";

import { TOOL_DEFINITIONS } from "@/lib/tool-registry";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ethiotime.com";

// Derived from the registry so a removed tool can never linger in the sitemap.
const ROUTES = ["/", ...TOOL_DEFINITIONS.map((tool) => tool.href)];

const HIGH_PRIORITY_ROUTES = new Set([
  "/",
  "/date-converter",
  "/event-planner",
  "/holidays",
]);

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return ROUTES.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: HIGH_PRIORITY_ROUTES.has(route) ? "weekly" : "monthly",
    priority: route === "/" ? 1 : HIGH_PRIORITY_ROUTES.has(route) ? 0.9 : 0.8,
  }));
}
