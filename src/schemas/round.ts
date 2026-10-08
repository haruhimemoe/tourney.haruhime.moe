/**
 * @file src/schemas/round.ts
 * @desc A stored round: the library's RoundSchema plus its edition, its pool link on
 *       pools.haruhime.moe, whether that link shows yet, a star range and its play window.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { IdSchema, InstantSchema, RoundSchema } from "@haruhimemoe/tourney";
import { z } from "zod";

/** A stored round. */
export const StoredRoundSchema = RoundSchema.extend({
  id: IdSchema,
  editionId: IdSchema,
  poolId: z.string().min(1).max(64).nullable(),
  poolRevealed: z.boolean(),
  starRange: z.object({ min: z.number().min(0), max: z.number().min(0) }).nullable(),
  window: z.object({ start: InstantSchema, end: InstantSchema }).nullable(),
});

/** A stored round. */
export type StoredRound = z.infer<typeof StoredRoundSchema>;
