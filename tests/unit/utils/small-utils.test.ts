/**
 * @file tests/unit/utils/small-utils.test.ts
 * @desc datetime-local round trips (empty and invalid values), side and rank labels, and how a
 *       stored answer reads once its question or option is gone.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { describe, expect, it } from "vitest";
import { displayAnswer } from "@/utils/answers";
import { fromLocalInput, toLocalInput } from "@/utils/local-time";
import { rankLabel, sidesLabel } from "@/utils/side-format";

describe("local-time", () => {
  it("round-trips an instant and refuses empty or bad values", () => {
    const iso = "2026-11-02T18:00:00.000Z";
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
    expect(toLocalInput(null)).toBe("");
    expect(fromLocalInput("")).toBeNull();
    expect(fromLocalInput("not a date")).toBeNull();
  });
});

describe("side-format", () => {
  it("labels solo and team sides, and any rank", () => {
    expect(sidesLabel({ kind: "solo", lineup: 1, rosterMin: 1, rosterMax: 1, subsMax: 0 })).toBe(
      "1v1",
    );
    expect(sidesLabel({ kind: "team", lineup: 3, rosterMin: 3, rosterMax: 6, subsMax: 0 })).toBe(
      "3v3",
    );
    expect(rankLabel(null)).toBe("Any rank");
    expect(rankLabel({ min: 1, max: 1000 })).toBe("#1 to #1,000");
  });
});

describe("displayAnswer", () => {
  const choice = {
    id: "q",
    label: "Pick",
    required: false,
    type: "choice",
    options: ["a", "b"],
  } as never;
  it("reads booleans, lists and blanks", () => {
    expect(
      displayAnswer({ id: "c", label: "C", required: false, type: "checkbox" } as never, true),
    ).toBe("Yes");
    expect(
      displayAnswer({ id: "c", label: "C", required: false, type: "checkbox" } as never, false),
    ).toBe("No");
    expect(displayAnswer(choice, undefined)).toBe("-");
    expect(displayAnswer({ ...(choice as object), type: "multi" } as never, [])).toBe("-");
    expect(displayAnswer({ ...(choice as object), type: "multi" } as never, ["a", "b"])).toBe(
      "a, b",
    );
  });

  it("marks a removed question or option", () => {
    expect(displayAnswer(undefined, "x")).toBe("x (question removed)");
    expect(displayAnswer(undefined, "")).toBe("-");
    expect(displayAnswer(choice, "z")).toBe("z (no longer an option)");
    expect(displayAnswer(choice, "a")).toBe("a");
  });
});
