/**
 * @file src/schemas/edition.ts
 * @desc An edition: one run of a lineage. The library's TournamentSchema plus where it lives
 *       (lineage, slug), dates, rules, who may register, its questions, its bracket config and
 *       its settings page fields (acronym, banner, hue, socials, contact). DatesSchema refuses a
 *       start after an end (only when both are set), on ["end"], so the settings PATCH body and
 *       createEdition (both built from EditionSchema.shape.dates / EditionSchema itself) share
 *       the one rule. BWS is out of v0, so eligibility has rank, countries and regions only.
 *       withEditionDefaults patches in those settings fields for a row written before they
 *       existed, without a full re-parse (so other legacy drift in an old row doesn't start
 *       throwing on read).
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
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
import { ContactSchema, SocialsSchema } from "@/schemas/social";

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

/**
 * An edition's dates: start and end are each optional, but when both are set, start can't be
 * after end. Shared by EditionSchema (so createEdition's safeParse enforces it) and the settings
 * PATCH route's body schema (EditionSchema.shape.dates).
 */
export const DatesSchema = z
  .object({ start: InstantSchema.nullable(), end: InstantSchema.nullable() })
  .refine((d) => d.start === null || d.end === null || d.start <= d.end, {
    message: "The end date can't be before the start date.",
    path: ["end"],
  });

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
  dates: DatesSchema,
  rulesText: z.string().max(MAX_RULES_TEXT),
  siteMode: z.enum(SITE_MODES),
  qualifiers: z.object({ enabled: z.boolean(), method: z.enum(["sum", "average-rank"]) }),
  bracket: BracketConfigSchema.nullable(),
  eligibility: EligibilitySchema,
  questions: z.array(QuestionSchema).max(MAX_QUESTIONS),
  pickBanRules: PickBanRulesSchema.nullable(),
  archived: z.boolean().default(false),
  acronym: z.string().max(12).nullable().default(null),
  bannerUrl: z.string().url().max(300).nullable().default(null),
  hue: z.number().int().min(0).max(359).nullable().default(null),
  socials: SocialsSchema.default([]),
  contact: ContactSchema.default({ email: null, discord: null }),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});

/** A stored edition. */
export type Edition = z.infer<typeof EditionSchema>;

/**
 * @function withEditionDefaults
 * @param doc {Edition} an edition as read from storage, maybe from before its settings fields
 *        existed
 * @returns {Edition} the same row with acronym, bannerUrl, hue, socials and contact filled in
 *          when they're missing; every other field is left untouched
 */
export const withEditionDefaults = (doc: Edition): Edition => ({
  ...doc,
  acronym: doc.acronym ?? null,
  bannerUrl: doc.bannerUrl ?? null,
  hue: doc.hue ?? null,
  socials: doc.socials ?? [],
  contact: doc.contact ?? { email: null, discord: null },
});
