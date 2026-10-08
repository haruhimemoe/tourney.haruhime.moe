/**
 * @file src/app/robots.ts
 * @desc robots.txt through next-kit's robots: everything is crawlable except the API, admin,
 *       manage, sign-in and account pages and registration forms, for search engines and AI
 *       crawlers alike, plus the sitemap and host. Static.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { robots as robotsFor } from "@haruhimemoe/next-kit/seo";
import type { MetadataRoute } from "next";
import { SEO_SITE } from "@/constants/seo";

// Paths no crawler should fetch.
const DISALLOWED_PATHS: readonly string[] = [
  "/api/",
  "/admin",
  "/manage",
  "/signin",
  "/account",
  "/*/register",
];

/**
 * @function robots
 * @returns {MetadataRoute.Robots} crawl rules, the sitemap and the host
 */
export default function robots(): MetadataRoute.Robots {
  return robotsFor(SEO_SITE, { allow: ["/"], disallow: DISALLOWED_PATHS, aiBots: "allow" });
}
