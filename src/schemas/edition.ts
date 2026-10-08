/**
 * @file src/schemas/edition.ts
 * @desc An edition: one run of a lineage. The library's TournamentSchema plus where it lives
 *       (lineage, slug), dates, rules, who may register, its questions and its bracket config.
 *       BWS is out of v0, so eligibility has rank, countries and regions only.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import {
  FormatSchema,
  IdSchema,
  InstantSchema,
  PickBanRulesSchema,
  TournamentSchema,
} from "@haruhimemoe/tourney";
import { z } from "zod";
import { MAX_RULES_TEXT } from "@/schemas/lineage";
import { MAX_QUESTIONS, QuestionSchema } from "@/schemas/question";

/**
 * @function editionSlug
 * @param code {string} an edition code, like "EGC 2026"
 * @returns {string} its URL segment: lowercase, spaces and underscores to "-", other characters
 *          dropped, no leading, trailing or doubled "-"
 */
export const editionSlug = (code: string): string =>
  code
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const range = z
  .object({ min: z.number().int().positive(), max: z.number().int().positive() })
  .refine((r) => r.min <= r.max, "min is above max");

/** When the public page shows: auto from registration on, never, or always. */
export const SITE_MODES = ["auto", "hidden", "live"] as const;

/** Who may register. Null means no limit of that kind. */
export const EligibilitySchema = z.object({
  rank: range.nullable(),
  countries: z.array(z.string().length(2)).max(250).nullable(),
  regions: z.array(z.string().min(1).max(32)).max(32).nullable(),
});

/** An edition's eligibility rules. */
export type Eligibility = z.infer<typeof EligibilitySchema>;

/** The main bracket's settings. bestOf is keyed by round code. */
export const BracketConfigSchema = z.object({
  format: FormatSchema,
  size: z.number().int().min(2).max(256),
  bestOf: z.record(z.string(), z.number().int().min(1).max(13)),
  thirdPlace: z.boolean(),
  grandFinalReset: z.boolean(),
  seeding: z.enum(["manual", "qualifiers", "random"]),
  randomSeed: z.number().int().nullable(),
});

/** An edition's bracket settings. */
export type BracketConfig = z.infer<typeof BracketConfigSchema>;

/** A stored edition. */
export const EditionSchema = TournamentSchema.extend({
  lineageId: IdSchema,
  slug: z.string().min(1).max(16),
  year: z.number().int().min(2007).max(2100),
  dates: z.object({ start: InstantSchema.nullable(), end: InstantSchema.nullable() }),
  rulesText: z.string().max(MAX_RULES_TEXT),
  siteMode: z.enum(SITE_MODES),
  qualifiers: z.object({ enabled: z.boolean(), method: z.enum(["sum", "average-rank"]) }),
  bracket: BracketConfigSchema.nullable(),
  eligibility: EligibilitySchema,
  questions: z.array(QuestionSchema).max(MAX_QUESTIONS),
  pickBanRules: PickBanRulesSchema.nullable(),
  archived: z.boolean().default(false),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});

/** A stored edition. */
export type Edition = z.infer<typeof EditionSchema>;
