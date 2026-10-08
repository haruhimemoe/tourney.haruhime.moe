/**
 * @file tests/unit/schemas/stored.test.ts
 * @desc The stored-document schemas parse a good document and refuse a broken one: availability,
 *       bracket stage, match, profile, registration and team.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { describe, expect, it } from "vitest";
import { StoredAvailabilitySchema } from "@/schemas/availability";
import { StoredBracketSchema } from "@/schemas/bracket";
import { StoredMatchSchema } from "@/schemas/match";
import { ProfileSchema } from "@/schemas/profile";
import { StoredRegistrationSchema } from "@/schemas/registration";
import { StoredTeamSchema } from "@/schemas/team";
import { makeRegistration, T0 } from "../../helpers/records";

const ID = "a".repeat(24);

describe("stored schemas", () => {
  it("parse good documents", () => {
    expect(
      ProfileSchema.safeParse({ userId: ID, verifiedHost: true, timezone: null }).success,
    ).toBe(true);
    expect(
      StoredTeamSchema.safeParse({
        id: ID,
        editionId: ID,
        name: "Team",
        tag: null,
        captainId: 1,
        roster: [1],
        subs: [],
        seed: null,
        status: "active",
      }).success,
    ).toBe(true);
    expect(
      StoredBracketSchema.safeParse({
        id: ID,
        editionId: ID,
        stage: "main",
        bracket: null,
        state: null,
        version: 0,
      }).success,
    ).toBe(true);
    expect(
      StoredRegistrationSchema.safeParse({
        ...makeRegistration(),
        id: ID,
        editionId: ID,
        userId: ID,
      }).success,
    ).toBe(true);
    expect(
      StoredMatchSchema.safeParse({
        id: ID,
        editionId: ID,
        roundId: ID,
        bracketCode: "M1",
        round: "SF",
        a: null,
        b: null,
        bestOf: 7,
        status: "scheduled",
        scheduledAt: null,
        scoreA: null,
        scoreB: null,
        winner: null,
        mpLinks: [],
        streamUrl: null,
        vodUrl: null,
        refereeIds: [],
        streamerIds: [],
        commentatorIds: [],
        pickBans: [],
        maps: [],
        reschedules: [],
        notes: null,
      }).success,
    ).toBe(true);
    expect(StoredAvailabilitySchema.shape.zone.safeParse("UTC").success).toBe(true);
    expect(StoredAvailabilitySchema.shape.updatedAt.safeParse(T0).success).toBe(true);
  });

  it("refuse broken ones", () => {
    expect(
      ProfileSchema.safeParse({ userId: ID, verifiedHost: "yes", timezone: null }).success,
    ).toBe(false);
    expect(StoredBracketSchema.safeParse({ id: ID, editionId: ID, stage: "finals" }).success).toBe(
      false,
    );
    expect(
      StoredRegistrationSchema.safeParse({ ...makeRegistration(), snapshot: { username: "" } })
        .success,
    ).toBe(false);
  });
});
