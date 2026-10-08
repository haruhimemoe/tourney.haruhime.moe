/**
 * @file src/schemas/match.ts
 * @desc A stored match: the library's MatchSchema plus its edition and round.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { IdSchema, MatchSchema } from "@haruhimemoe/tourney";
import type { z } from "zod";

/** A stored match. */
export const StoredMatchSchema = MatchSchema.extend({ editionId: IdSchema, roundId: IdSchema });

/** A stored match. */
export type StoredMatch = z.infer<typeof StoredMatchSchema>;
