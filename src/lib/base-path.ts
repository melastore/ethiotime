/**
 * Where the site is served from. A GitHub Pages project site lives under a
 * sub-path, and Next only rewrites the URLs it generates itself: paths written
 * by hand — icons, the manifest, image sources — have to carry the prefix.
 */

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (path: string) => `${BASE_PATH}${path}`;
