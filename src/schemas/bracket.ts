/**
 * @file src/schemas/bracket.ts
 * @desc One stage of an edition's bracket, stored whole: the main bracket as the library's
 *       Bracket, groups and swiss as their own state. `version` counts saves, so two staff saving
 *       at once can't lose a write.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { BracketSchema, IdSchema } from "@haruhimemoe/tourney";
import { z } from "zod";

/** The stages an edition can have. */
export const STAGES = ["groups", "swiss", "main"] as const;

/** A stored bracket stage. */
export const StoredBracketSchema = z.object({
  id: IdSchema,
  editionId: IdSchema,
  stage: z.enum(STAGES),
  bracket: BracketSchema.nullable(),
  state: z.unknown(),
  version: z.number().int().min(0),
});

/** A stored bracket stage. */
export type StoredBracket = z.infer<typeof StoredBracketSchema>;
