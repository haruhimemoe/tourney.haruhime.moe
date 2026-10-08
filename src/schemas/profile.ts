/**
 * @file src/schemas/profile.ts
 * @desc App-only fields per haruhime account: verified host and time zone.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { IdSchema } from "@haruhimemoe/tourney";
import { z } from "zod";

/** A stored profile. */
export const ProfileSchema = z.object({
  userId: IdSchema,
  verifiedHost: z.boolean(),
  timezone: z.string().min(1).max(64).nullable(),
});

/** A stored profile. */
export type Profile = z.infer<typeof ProfileSchema>;
