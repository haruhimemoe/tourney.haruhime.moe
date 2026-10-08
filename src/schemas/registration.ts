/**
 * @file src/schemas/registration.ts
 * @desc A stored registration: the library's RegistrationSchema plus its edition, the haruhime
 *       account (null once anonymized after account delete), answers, the osu! snapshot taken
 *       at submit, the team a captain registered, and the host's note.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { IdSchema, InstantSchema, OsuIdSchema, RegistrationSchema } from "@haruhimemoe/tourney";
import { z } from "zod";

/** What osu! said about the player when they registered; never refreshed. */
export const SnapshotSchema = z.object({
  rank: z.number().int().positive().nullable(),
  country: z.string().length(2).nullable(),
  takenAt: InstantSchema,
});

/** A stored registration. */
export const StoredRegistrationSchema = RegistrationSchema.extend({
  editionId: IdSchema,
  userId: IdSchema.nullable(),
  answers: z.record(z.string(), z.unknown()),
  snapshot: SnapshotSchema,
  team: z
    .object({
      name: z.string().trim().min(1).max(32),
      tag: z.string().trim().min(1).max(8).nullable(),
      members: z.array(OsuIdSchema).max(32),
    })
    .nullable(),
  reviewNote: z.string().max(500).nullable(),
});

/** A stored registration. */
export type StoredRegistration = z.infer<typeof StoredRegistrationSchema>;
