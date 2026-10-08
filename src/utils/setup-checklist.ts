/**
 * @file src/utils/setup-checklist.ts
 * @desc What a new edition still needs before each phase (the setup checklist), and the phase
 *       the "Move to" button offers next: qualifiers only when they're on, and never draft,
 *       which has no page in v0.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { type Phase, TOURNAMENT_PHASES } from "@haruhimemoe/tourney";
import type { Edition } from "@/schemas/edition";
import type { StoredRound } from "@/schemas/round";

/** One line of the checklist. */
export type ChecklistItem = {
  item: "registration" | "questions" | "eligibility" | "rounds" | "pools";
  done: boolean;
  neededFor: Phase;
};

/**
 * @function setupChecklist
 * @param edition {Edition} the edition
 * @param rounds {readonly Pick<StoredRound, "poolId">[]} its rounds
 * @returns {ChecklistItem[]} each item, whether it's done and the phase that needs it
 */
export const setupChecklist = (
  edition: Edition,
  rounds: readonly Pick<StoredRound, "poolId">[],
): ChecklistItem[] => {
  const { opensAt, closesAt } = edition.registration;
  const { rank, countries, regions } = edition.eligibility;
  const playPhase: Phase = edition.qualifiers.enabled ? "qualifiers" : "bracket";
  return [
    {
      item: "registration",
      done: opensAt !== null && closesAt !== null,
      neededFor: "registration",
    },
    { item: "questions", done: edition.questions.length > 0, neededFor: "registration" },
    {
      item: "eligibility",
      done: rank !== null || countries !== null || regions !== null,
      neededFor: "registration",
    },
    { item: "rounds", done: rounds.length > 0, neededFor: playPhase },
    {
      item: "pools",
      done: rounds.length > 0 && rounds.every((r) => r.poolId !== null),
      neededFor: playPhase,
    },
  ];
};

/**
 * @function nextPhase
 * @param edition {Pick<Edition, "phase" | "qualifiers">} the edition
 * @returns {Phase | null} the phase to offer next, or null once it's done
 */
export const nextPhase = (edition: Pick<Edition, "phase" | "qualifiers">): Phase | null => {
  const later = TOURNAMENT_PHASES.slice(TOURNAMENT_PHASES.indexOf(edition.phase) + 1);
  return (
    later.find((p) => p !== "draft" && (p !== "qualifiers" || edition.qualifiers.enabled)) ?? null
  );
};
