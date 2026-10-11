/**
 * @file src/schemas/lineage.ts
 * @desc A lineage: a tournament series (Evergreen Cup) with one owner, its admins and the
 *       defaults each new edition starts from (including socials, contact and hue). Its slug is
 *       the first URL segment, so route names are reserved. withLineageDefaults patches in those
 *       default fields for a row written before they existed, without a full re-parse (so other
 *       legacy drift in an old row doesn't start throwing on read).
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

import { IdSchema, InstantSchema, MODES, SideRulesSchema } from "@haruhimemoe/tourney";
import { z } from "zod";
import { ContactSchema, SocialsSchema } from "@/schemas/social";

/** 3 to 40 of a-z, 0-9 and "-", not starting or ending with "-". */
export const LINEAGE_SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;

/** Top-level route names a lineage can't take. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "manage",
  "browse",
  "account",
  "signin",
  "docs",
  "legal",
  "brand",
  "credits",
  "admin",
  "api",
  "embed",
  "v1",
  "ics",
  "overlay",
]);

/** v0's two lineage roles; spec 2 adds more. */
export const LINEAGE_ROLES = ["owner", "admin"] as const;

/** A lineage role. */
export type LineageRole = (typeof LINEAGE_ROLES)[number];

/** One account's role on a lineage. */
export const MemberSchema = z.object({ userId: IdSchema, role: z.enum(LINEAGE_ROLES) });

/** A lineage member. */
export type Member = z.infer<typeof MemberSchema>;

/** Rules text is plain Markdown, at most this long. */
export const MAX_RULES_TEXT = 20_000;

/** A stored lineage. `orphaned` is set when its owner deleted their account. */
export const LineageSchema = z.object({
  id: IdSchema,
  slug: z.string().regex(LINEAGE_SLUG),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500),
  members: z.array(MemberSchema).max(20),
  orphaned: z.boolean().default(false),
  defaults: z.object({
    mode: z.enum(MODES),
    sides: SideRulesSchema,
    rulesText: z.string().max(MAX_RULES_TEXT),
    socials: SocialsSchema.default([]),
    contact: ContactSchema.default({ email: null, discord: null }),
    hue: z.number().int().min(0).max(359).nullable().default(null),
  }),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});

/** A stored lineage. */
export type Lineage = z.infer<typeof LineageSchema>;

/**
 * @function withLineageDefaults
 * @param doc {Lineage} a lineage as read from storage, maybe from before `defaults.socials`,
 *        `defaults.contact` or `defaults.hue` existed
 * @returns {Lineage} the same row with those three filled in when missing; every other field,
 *          including the rest of `defaults`, is left untouched
 */
export const withLineageDefaults = (doc: Lineage): Lineage => ({
  ...doc,
  defaults: {
    ...doc.defaults,
    socials: doc.defaults.socials ?? [],
    contact: doc.defaults.contact ?? { email: null, discord: null },
    hue: doc.defaults.hue ?? null,
  },
});
