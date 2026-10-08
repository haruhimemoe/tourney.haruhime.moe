/**
 * @file src/schemas/availability.ts
 * @desc A player's weekly availability: a UTC grid from @haruhimemoe/time, the zone they entered
 *       it in, and the edition it's for (null: their default, copied into an edition when they
 *       register).
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { availabilitySchema } from "@haruhimemoe/time/availability";
import { InstantSchema } from "@haruhimemoe/tourney";
import { z } from "zod";

/** A stored availability. */
export const StoredAvailabilitySchema = z.object({
  id: z.string(),
  userId: z.string(),
  editionId: z.string().nullable(),
  zone: z.string().min(1).max(64),
  grid: availabilitySchema,
  updatedAt: InstantSchema,
});

/** A stored availability. */
export type StoredAvailability = z.infer<typeof StoredAvailabilitySchema>;
