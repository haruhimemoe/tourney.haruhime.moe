/**
 * @file src/constants/manage.ts
 * @desc Copy and presets for the manage pages: team size presets, modes, checklist labels and
 *       phase names.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import type { Phase, SideRules } from "@haruhimemoe/tourney";
import type { ChecklistItem } from "@/utils/setup-checklist";

/** Team size presets on the create form. */
export const SIDE_PRESETS: readonly { value: string; label: string; sides: SideRules }[] = [
  {
    value: "1v1",
    label: "1v1",
    sides: { kind: "solo", lineup: 1, rosterMin: 1, rosterMax: 1, subsMax: 0 },
  },
  {
    value: "2v2",
    label: "2v2",
    sides: { kind: "team", lineup: 2, rosterMin: 2, rosterMax: 4, subsMax: 2 },
  },
  {
    value: "3v3",
    label: "3v3",
    sides: { kind: "team", lineup: 3, rosterMin: 3, rosterMax: 6, subsMax: 3 },
  },
  {
    value: "4v4",
    label: "4v4",
    sides: { kind: "team", lineup: 4, rosterMin: 4, rosterMax: 8, subsMax: 4 },
  },
];

/** osu! modes by their API names. */
export const MODE_LABELS: Record<string, string> = {
  osu: "osu!",
  taiko: "osu!taiko",
  fruits: "osu!catch",
  mania: "osu!mania",
};

/** The checklist's line for each item. */
export const CHECKLIST_LABELS: Record<ChecklistItem["item"], string> = {
  registration: "Registration opens and closes",
  questions: "Registration questions",
  eligibility: "Who may register (rank, countries)",
  rounds: "Rounds",
  pools: "A mappool for every round",
};

/** Each phase as people read it. */
export const PHASE_LABELS: Record<Phase, string> = {
  setup: "Setup",
  registration: "Registration",
  qualifiers: "Qualifiers",
  draft: "Draft",
  bracket: "Bracket",
  done: "Done",
};
