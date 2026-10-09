/**
 * @file next.config.ts
 * @desc Next.js config: MDX page extensions (the docs and legal pages), strict mode, unoptimized images
 *       (every raster is an osu! CDN asset we never transform), security headers on every route
 *       (no framing, no MIME sniffing, a trimmed Referer, images only from here, data: URIs and
 *       osu!'s avatar hosts; a full CSP needs nonces and comes later), no X-Powered-By. Each docs
 *       and legal page's Markdown mirror is served at <path>.md (next-kit's contentRewrites).
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { contentRewrites } from "@haruhimemoe/next-kit/docs";
import createMDX from "@next/mdx";
import type { NextConfig } from "next";

// Turbopack only takes MDX plugins as module names, not imported functions. remark-gfm adds pipe
// tables, task lists and strikethrough.
const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: { remarkPlugins: ["remark-gfm", "@haruhimemoe/ui/remark"] },
});

/**
 * frame-ancestors (with X-Frame-Options for older browsers) stops clickjacking. Images load from
 * here, data: URIs (inline images CSS and Next.js may use; they can't run script) and osu!'s
 * hosts only: avatars (a.ppy.sh, and osu.ppy.sh's guest avatar) and covers (assets.ppy.sh).
 * No media plays. Nothing else is limited yet.
 */
const CSP = [
  "frame-ancestors 'none'",
  "img-src 'self' data: https://a.ppy.sh https://osu.ppy.sh https://assets.ppy.sh",
  "media-src 'none'",
].join("; ");

/** Sent on every route. */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async rewrites() {
    return {
      beforeFiles: [],
      // A dynamic segment can't end in ".md", so each content page's Markdown route lives one
      // level down (/docs/x.md and /legal/x.md to .../x/md).
      afterFiles: [...contentRewrites()],
      fallback: [],
    };
  },
};

export default withMDX(nextConfig);
