/**
 * @file src/schemas/team.ts
 * @desc A stored team: the library's TeamSchema plus its edition and whether it's still in.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { IdSchema, TeamSchema } from "@haruhimemoe/tourney";
import { z } from "zod";

/** A stored team. */
export const StoredTeamSchema = TeamSchema.extend({
  editionId: IdSchema,
  status: z.enum(["active", "eliminated", "withdrawn"]),
});

/** A stored team. */
export type StoredTeam = z.infer<typeof StoredTeamSchema>;
