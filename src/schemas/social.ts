/**
 * @file src/schemas/social.ts
 * @desc A social link: a kind, an https URL whose host matches that kind, and an optional label
 *       (required for "custom"). An edition shows at most MAX_SOCIALS of them.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { z } from "zod";

/** Every social link kind. */
export const SOCIAL_KINDS = [
  "discord",
  "twitter",
  "twitch",
  "youtube",
  "website",
  "challonge",
  "sheets",
  "forum",
  "custom",
] as const;

/** Most social links an edition shows. */
export const MAX_SOCIALS = 12;

/** Hosts each kind accepts; null means any https host. */
const HOSTS: Record<(typeof SOCIAL_KINDS)[number], readonly string[] | null> = {
  discord: ["discord.gg", "discord.com"],
  twitter: ["twitter.com", "x.com"],
  twitch: ["twitch.tv", "www.twitch.tv"],
  youtube: ["youtube.com", "www.youtube.com", "youtu.be"],
  challonge: ["challonge.com"],
  sheets: ["docs.google.com"],
  forum: ["osu.ppy.sh"],
  website: null,
  custom: null,
};

/**
 * @function hostOf
 * @param url {string} a candidate URL
 * @returns {string | null} its hostname when the scheme is https, else null
 */
const hostOf = (url: string): string | null => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.hostname : null;
  } catch {
    return null;
  }
};

/** One social link. */
export const SocialSchema = z
  .object({
    kind: z.enum(SOCIAL_KINDS),
    url: z.string().max(300),
    label: z.string().min(1).max(40).nullable(),
  })
  .superRefine((s, ctx) => {
    const host = hostOf(s.url);
    const allowed = HOSTS[s.kind];
    if (!host) ctx.addIssue({ code: "custom", path: ["url"], message: "Use an https:// link." });
    else if (allowed && !allowed.some((h) => host === h || host.endsWith(`.${h}`)))
      ctx.addIssue({ code: "custom", path: ["url"], message: `Use a ${allowed[0]} link.` });
    if (s.kind === "custom" && !s.label)
      ctx.addIssue({ code: "custom", path: ["label"], message: "Name this link." });
  });

/** One social link. */
export type Social = z.infer<typeof SocialSchema>;

/** An edition's social links. */
export const SocialsSchema = z.array(SocialSchema).max(MAX_SOCIALS);
