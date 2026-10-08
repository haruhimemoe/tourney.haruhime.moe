/**
 * @file src/constants/seo.ts
 * @desc Search and link-preview copy: the one next-kit `Site` every seo helper reads (home
 *       keyword title, the 160-character description, the static link preview, haruhime.moe as
 *       the organization and parent), each static page's title and description, and the
 *       WebApplication features.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { HARUHIME_ORG, type Site } from "@haruhimemoe/next-kit/seo";
import { SITE } from "@/constants/site";

/** The site as @haruhimemoe/next-kit/seo reads it: "osu! tournament hosting · tourney". */
export const SEO_SITE: Site = {
  name: SITE.name,
  url: SITE.url,
  title: "osu! tournament hosting",
  shortTitleSuffix: "tourney",
  description: SITE.description,
  ogImages: [
    {
      url: "/opengraph-image.png",
      width: 1200,
      height: 630,
      alt: "tourney: osu! tournaments, run in one place",
      type: "image/png",
    },
  ],
  organization: HARUHIME_ORG,
  parent: { name: "haruhime.moe", url: SITE.parentUrl },
};

/** A static page's title (before " · host") and its 140 to 160 character description. */
export type PageSeo = { title: string; description: string };

/** The static public pages' titles and descriptions, by path. */
export const PAGE_SEO = {
  "/browse": {
    title: "osu! tournaments open for registration",
    description:
      "osu! tournaments hosted on tourney.haruhime.moe that are open for registration or running now, with their mode, team size, rank range and dates at a glance.",
  },
  "/credits": {
    title: "Credits",
    description:
      "Who tourney is built on: the haruhime libraries for brackets, pools and time zones, the osu! API by ppy, and the tournament hosts who shaped how it works.",
  },
} as const satisfies Record<string, PageSeo>;

/** What the WebApplication node lists as features. */
export const APP_FEATURES: readonly string[] = [
  "Registration with custom questions, rank and country limits",
  "Solo and team tournaments",
  "Qualifiers and seeding",
  "Single and double elimination, groups and swiss",
  "Scheduling across time zones",
  "Results from osu! multiplayer links",
];
