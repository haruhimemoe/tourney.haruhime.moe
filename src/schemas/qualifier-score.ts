/**
 * @file src/schemas/qualifier-score.ts
 * @desc One team's qualifier score on one pool slot, keyed by the slot's @haruhimemoe/pool key.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { IdSchema } from "@haruhimemoe/tourney";
import { z } from "zod";

/** The most score rows one save takes (64 teams by 32 maps). */
export const MAX_QUALIFIER_ROWS = 2048;

/** A stored qualifier score. */
export const QualifierScoreSchema = z.object({
  id: IdSchema,
  editionId: IdSchema,
  roundId: IdSchema,
  teamId: IdSchema,
  slotKey: z.string().min(1).max(32),
  score: z.number().int().min(0).max(100_000_000),
});

/** A stored qualifier score. */
export type QualifierScore = z.infer<typeof QualifierScoreSchema>;
