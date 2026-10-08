/**
 * @file src/components/manage/SetupChecklist.tsx
 * @desc The setup checklist: each item with done or missing and the phase that needs it.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { Badge, Card } from "@haruhimemoe/ui";
import { CHECKLIST_LABELS, PHASE_LABELS } from "@/constants/manage";
import type { ChecklistItem } from "@/utils/setup-checklist";

/** SetupChecklist's props: the checklist. */
export type SetupChecklistProps = { items: readonly ChecklistItem[] };

/**
 * @function SetupChecklist
 * @param props {SetupChecklistProps} the items
 * @returns {JSX.Element} the list in a card
 */
export function SetupChecklist({ items }: SetupChecklistProps) {
  return (
    <Card title="Setup">
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <li key={i.item} className="flex flex-wrap items-center gap-2">
            <Badge tone={i.done ? "accent" : "muted"}>{i.done ? "Done" : "Missing"}</Badge>
            <span>{CHECKLIST_LABELS[i.item]}</span>
            <span className="text-c3 text-sm">before {PHASE_LABELS[i.neededFor]}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
