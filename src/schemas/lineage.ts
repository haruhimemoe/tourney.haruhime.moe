/**
 * @file src/schemas/lineage.ts
 * @desc A lineage: a tournament series (Evergreen Cup) with one owner, its admins and the
 *       defaults each new edition starts from. Its slug is the first URL segment, so route
 *       names are reserved.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { IdSchema, InstantSchema, MODES, SideRulesSchema } from "@haruhimemoe/tourney";
import { z } from "zod";

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
  }),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});

/** A stored lineage. */
export type Lineage = z.infer<typeof LineageSchema>;
