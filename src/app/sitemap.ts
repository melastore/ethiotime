import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ethiotime.com";

const ROUTES = [
  "/",
  "/date-converter",
  "/age-calculator",
  "/ethiopian-calendar",
  "/amharic-keyboard",
  "/note-taking",
  "/event-planner",
  "/date-difference",
  "/holidays",
  "/ethiopian-now",
];

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
