/**
 * @file src/constants/site.ts
 * @desc Site identity, the contact email and Discord server, the source repo, the parent brand
 *       and GitHub org, navigation and the footer's own columns (ui's SiteFooter adds the other
 *       haruhime tools), the affiliation notice, the User-Agent our server sends, the
 *       haruhime.moe hub's account page and cookie domain, the shared signed-in marker and
 *       sign-in's landing.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

import { SHARED_MARKER_COOKIE } from "@haruhimemoe/next-kit/auth-react";
import { contentPath } from "@haruhimemoe/next-kit/docs";
import type { SiteFooterColumn } from "@haruhimemoe/ui";
import { CONTENT } from "@/constants/content";

/** The site's name, URL, description (the meta description, 160 characters at most) and links. */
export const SITE = {
  name: "tourney",
  title: "tourney.haruhime.moe",
  url: "https://tourney.haruhime.moe",
  description: "Run an osu! tournament: registration, brackets, schedule and results in one place.",
  contactEmail: "haruhime@haruhime.moe",
  /** The haruhime.moe Discord server: host support, raising the edition limit, the footer's Discord icon. */
  discordUrl: "https://haruhime.moe/discord",
  /** Public source repository, linked from the footer. */
  repoUrl: "https://github.com/haruhimemoe/tourney.haruhime.moe",
  /** GitHub private vulnerability reporting, the first way to report one (SECURITY.md). */
  advisoriesUrl: "https://github.com/haruhimemoe/tourney.haruhime.moe/security/advisories/new",
  /** The parent brand, linked from the footer wordmark. */
  parentUrl: "https://www.haruhime.moe",
  /** The GitHub organization, linked from the footer's GitHub mark. */
  githubOrg: "https://github.com/haruhimemoe",
  trademarkNotice:
    "Not affiliated with or endorsed by ppy Pty Ltd or the osu! Tournament Committee. osu! is a trademark of ppy Pty Ltd.",
} as const;

/** Sent as User-Agent on every request our server makes (osu!, pools). */
export const SERVER_USER_AGENT = `${SITE.title} (+${SITE.url}; ${SITE.contactEmail})`;

/** Where sign-in comes back to when `next` is missing or not a safe path. */
export const DEFAULT_AFTER_SIGN_IN = "/account";

/** The haruhime.moe account page: the osu! account, sessions, sign-out and deleting the account. */
export const HUB_ACCOUNT_URL = "https://www.haruhime.moe/account";

/** The hub's sign-in route that goes straight to osu!, with `next` the absolute tourney URL. */
export const HUB_SIGN_IN_PATH = "/api/signin/osu";

/** The hub's cookie domain: its session cookie and the marker live on every haruhime.moe host. */
export const HUB_COOKIE_DOMAIN = ".haruhime.moe";

/** The readable "signed in" marker the hub sets on .haruhime.moe: pages ask for the session only
 * when it's there. tourney only reads it. */
export const SIGNED_IN_COOKIE = SHARED_MARKER_COOKIE;

/** A translator: next-intl's t for "tourney" or "common". */
type T = (key: string) => string;

/**
 * @function navLinks
 * @param t {T} the "tourney" translator
 * @returns {{ href: string; label: string }[]} the header's links
 */
export const navLinks = (t: T): { href: string; label: string }[] => [
  { href: "/", label: t("nav.home") },
  { href: "/browse", label: t("nav.browse") },
  { href: "/manage/new", label: t("nav.host") },
];

/**
 * @function accountMenuItems
 * @param t {T} the "tourney" translator
 * @returns {{ href: string; label: string }[]} the header's account menu links, above Sign out
 */
export const accountMenuItems = (t: T): { href: string; label: string }[] => [
  { href: "/", label: t("nav.yours") },
  { href: "/account", label: t("nav.settings") },
];

/**
 * @function footerColumns
 * @param t {T} the "tourney" translator
 * @param common {T} the "common" translator
 * @returns {SiteFooterColumn[]} the footer's own link columns: tourney, About and Legal (ui adds
 *          "haruhime tools"). Legal page titles stay English, like the pages.
 */
export const footerColumns = (t: T, common: T): SiteFooterColumn[] => [
  {
    title: "tourney",
    items: [
      { href: "/browse", label: t("nav.browse") },
      { href: "/manage/new", label: t("nav.host") },
      { href: "/docs", label: t("nav.docs") },
      { href: "/credits", label: t("nav.credits") },
    ],
  },
  {
    title: common("footer.about"),
    items: [
      { href: SITE.repoUrl, label: common("footer.source") },
      { href: `mailto:${SITE.contactEmail}`, label: SITE.contactEmail },
    ],
  },
  {
    title: common("footer.legal"),
    items: CONTENT.entries.legal.map(({ slug, title }) => ({
      href: contentPath("legal", slug),
      label: title,
    })),
  },
];
