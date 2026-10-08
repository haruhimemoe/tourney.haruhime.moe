/**
 * @file tests/unit/utils/setup-checklist.test.ts
 * @desc The setup checklist: what's missing and which phase needs it, and the phase the
 *       "Move to" button offers (qualifiers skipped when off, draft always skipped in v0).
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import { nextPhase, setupChecklist } from "@/utils/setup-checklist";
import { makeEdition } from "../../helpers/records";

const round = (poolId: string | null) => ({ code: "RO16", poolId }) as never;

describe("setupChecklist", () => {
  it("flags a missing registration window before registration", () => {
    const items = setupChecklist(makeEdition(), []);
    expect(items.find((i) => i.item === "registration")).toMatchObject({
      done: false,
      neededFor: "registration",
    });
  });

  it("marks the window, questions and eligibility once set", () => {
    const edition = makeEdition({
      registration: {
        opensAt: "2026-10-10T00:00:00Z",
        closesAt: "2026-10-20T00:00:00Z",
        playerCap: null,
        staffCap: null,
      },
      questions: [{ id: "q", type: "text", label: "Discord", help: "", required: true }],
      eligibility: { rank: { min: 1, max: 10000 }, countries: null, regions: null },
    });
    const items = setupChecklist(edition, []);
    for (const item of ["registration", "questions", "eligibility"])
      expect(items.find((i) => i.item === item)?.done).toBe(true);
  });

  it("marks rounds done once any round exists, and pools once every round has one", () => {
    expect(
      setupChecklist(makeEdition(), [round(null)]).find((i) => i.item === "rounds")?.done,
    ).toBe(true);
    expect(setupChecklist(makeEdition(), [round(null)]).find((i) => i.item === "pools")?.done).toBe(
      false,
    );
    expect(setupChecklist(makeEdition(), []).find((i) => i.item === "pools")?.done).toBe(false);
    expect(setupChecklist(makeEdition(), [round("p1")]).find((i) => i.item === "pools")?.done).toBe(
      true,
    );
  });

  it("needs pools for qualifiers when qualifiers are on", () => {
    const edition = makeEdition({ qualifiers: { enabled: true, method: "sum" } });
    expect(setupChecklist(edition, []).find((i) => i.item === "pools")?.neededFor).toBe(
      "qualifiers",
    );
  });
});

describe("nextPhase", () => {
  it.each([
    ["setup", false, "registration"],
    ["registration", false, "bracket"],
    ["registration", true, "qualifiers"],
    ["qualifiers", true, "bracket"],
    ["bracket", false, "done"],
    ["done", false, null],
  ] as const)("from %s (qualifiers %s) offers %s", (phase, enabled, next) => {
    expect(nextPhase(makeEdition({ phase, qualifiers: { enabled, method: "sum" } }))).toBe(next);
  });
});
