import type { NextConfig } from "next";

// A GitHub Pages project site is served from a sub-path, so the prefix has to be
// baked into the build. Empty for a custom domain or for `next dev`.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Every page is client-side and keeps its data on the device, so the whole app
  // exports to static files and needs no server to run.
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  // Pages serves `/foo/` from `foo/index.html`; without this a deep link 404s.
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
