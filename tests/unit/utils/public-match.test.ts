/**
 * @file tests/unit/utils/public-match.test.ts
 * @desc Finding a public match by code: an unknown code and a bye are null (the page answers
 *       404), a real match comes back; team names by id.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { describe, expect, it } from "vitest";
import { findPublicMatch, teamNames } from "@/utils/public-match";
import { MATCH, TEAMS } from "../../components/edition/fixtures";

const bracketWith = (status: string) =>
  ({
    matches: [
      { code: "M1", status },
      { code: "M2", status: "bye" },
    ],
  }) as never;

describe("findPublicMatch", () => {
  it("finds a played match by code", () => {
    expect(findPublicMatch({ bracket: bracketWith("done"), matches: [MATCH] }, "M1")).toBe(MATCH);
  });

  it("is null for an unknown code or a bye", () => {
    expect(findPublicMatch({ bracket: bracketWith("done"), matches: [MATCH] }, "M9")).toBeNull();
    const bye = { ...MATCH, bracketCode: "M2" };
    expect(findPublicMatch({ bracket: bracketWith("done"), matches: [bye] }, "M2")).toBeNull();
  });

  it("is null for a cancelled match", () => {
    const cancelled = { ...MATCH, status: "cancelled" as const };
    expect(findPublicMatch({ bracket: null, matches: [cancelled] }, "M1")).toBeNull();
  });
});

describe("teamNames", () => {
  it("maps ids to names", () => {
    expect(teamNames(TEAMS)).toEqual({ t1: "Haruhi", t2: "<b>Bold</b>" });
  });
});
