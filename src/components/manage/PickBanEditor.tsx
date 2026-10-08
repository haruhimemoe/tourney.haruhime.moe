/**
 * @file src/components/manage/PickBanEditor.tsx
 * @desc A match's pick/ban log in order: who acted, what they did, on which slot, and who banned
 *       and picked first (the roll). The server checks it against the edition's rules. Controlled.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import type { FirstTurns, PickBanEntry, Side } from "@haruhimemoe/tourney";
import { Button, Select } from "@haruhimemoe/ui";

/** PickBanEditor's props: the log, who went first, the pool's slots and the sides' names. */
export type PickBanEditorProps = {
  value: readonly PickBanEntry[];
  onChange: (log: PickBanEntry[]) => void;
  first: FirstTurns;
  onFirstChange: (first: FirstTurns) => void;
  slots: readonly { slotKey: string; label: string }[];
  names: { a: string; b: string };
  disabled?: boolean;
};

const ACTIONS: PickBanEntry["action"][] = ["protect", "ban", "pick", "tiebreaker"];

/**
 * @function PickBanEditor
 * @param props {PickBanEditorProps} the log
 * @returns {JSX.Element} the first-turn selects, the rows and an add button
 */
export function PickBanEditor({
  value,
  onChange,
  first,
  onFirstChange,
  slots,
  names,
  disabled,
}: PickBanEditorProps) {
  const set = (i: number, change: Partial<PickBanEntry>) =>
    onChange(value.map((e, j) => (j === i ? { ...e, ...change } : e)));
  const sideSelect = (id: string, label: string, side: Side, onPick: (s: Side) => void) => (
    <Select
      id={id}
      label={label}
      value={side}
      onChange={(e) => onPick(e.target.value as Side)}
      disabled={disabled}
    >
      <option value="a">{names.a}</option>
      <option value="b">{names.b}</option>
    </Select>
  );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {sideSelect("first-ban", "Bans first", first.ban, (ban) =>
          onFirstChange({ ...first, ban }),
        )}
        {sideSelect("first-pick", "Picks first", first.pick, (pick) =>
          onFirstChange({ ...first, pick }),
        )}
      </div>
      {value.map((entry, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a log entry's place is its identity
        <div key={i} className="flex flex-wrap items-end gap-2">
          <Select
            id={`pb-side-${i}`}
            label={`Step ${i + 1} by`}
            value={entry.side ?? ""}
            onChange={(e) => set(i, { side: (e.target.value || null) as Side | null })}
            disabled={disabled}
          >
            <option value="a">{names.a}</option>
            <option value="b">{names.b}</option>
            <option value="">Nobody (tiebreaker)</option>
          </Select>
          <Select
            id={`pb-action-${i}`}
            label={`Step ${i + 1} action`}
            value={entry.action}
            onChange={(e) => set(i, { action: e.target.value as PickBanEntry["action"] })}
            disabled={disabled}
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Select
            id={`pb-slot-${i}`}
            label={`Step ${i + 1} slot`}
            value={entry.slot}
            onChange={(e) => set(i, { slot: e.target.value })}
            disabled={disabled}
          >
            {slots.map((s) => (
              <option key={s.slotKey} value={s.slotKey}>
                {s.label}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            disabled={disabled}
          >
            Remove
          </Button>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange([...value, { side: "a", action: "ban", slot: slots[0]?.slotKey ?? "" }])
          }
          disabled={disabled || slots.length === 0}
        >
          Add step
        </Button>
      </div>
    </div>
  );
}
