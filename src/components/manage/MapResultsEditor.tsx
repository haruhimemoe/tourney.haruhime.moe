/**
 * @file src/components/manage/MapResultsEditor.tsx
 * @desc A match's maps, one row each: the pool slot, who won, and whether it was a warmup or
 *       aborted (neither counts toward the score). Per-player scores from an mp fill are kept as
 *       they came; typed rows have none. Controlled.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import type { MapResult } from "@haruhimemoe/tourney";
import { Button, Checkbox, Select } from "@haruhimemoe/ui";

/** MapResultsEditor's props: the maps, the pool's slots and the sides' names. */
export type MapResultsEditorProps = {
  value: readonly MapResult[];
  onChange: (maps: MapResult[]) => void;
  slots: readonly { slotKey: string; label: string }[];
  names: { a: string; b: string };
  disabled?: boolean;
};

/**
 * @function MapResultsEditor
 * @param props {MapResultsEditorProps} the maps
 * @returns {JSX.Element} the rows and an add button
 */
export function MapResultsEditor({
  value,
  onChange,
  slots,
  names,
  disabled,
}: MapResultsEditorProps) {
  const set = (i: number, change: Partial<MapResult>) =>
    onChange(value.map((m, j) => (j === i ? { ...m, ...change } : m)));
  const add = () =>
    onChange([
      ...value,
      {
        slot: slots[0]?.slotKey ?? "",
        winner: null,
        warmup: false,
        aborted: false,
        lineupA: [],
        lineupB: [],
        scores: [],
      },
    ]);
  const label = (key: string) => slots.find((s) => s.slotKey === key)?.label ?? key;
  return (
    <div className="flex flex-col gap-2">
      {value.map((m, i) => (
        // Rows have no id of their own; their place is their identity while editing.
        // biome-ignore lint/suspicious/noArrayIndexKey: see above
        <div key={i} className="flex flex-wrap items-end gap-2">
          <Select
            id={`map-slot-${i}`}
            label={`Map ${i + 1}`}
            value={m.slot}
            onChange={(e) => set(i, { slot: e.target.value })}
            disabled={disabled}
          >
            {slots.some((s) => s.slotKey === m.slot) ? null : (
              <option value={m.slot}>{label(m.slot) || "Pick a slot"}</option>
            )}
            {slots.map((s) => (
              <option key={s.slotKey} value={s.slotKey}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select
            id={`map-winner-${i}`}
            label={`Winner of map ${i + 1}`}
            value={m.winner ?? ""}
            onChange={(e) => set(i, { winner: (e.target.value || null) as MapResult["winner"] })}
            disabled={disabled}
          >
            <option value="">None</option>
            <option value="a">{names.a}</option>
            <option value="b">{names.b}</option>
          </Select>
          <Checkbox
            id={`map-warmup-${i}`}
            label="Warmup"
            checked={m.warmup}
            onChange={(e) => set(i, { warmup: e.target.checked })}
            disabled={disabled}
          />
          <Checkbox
            id={`map-aborted-${i}`}
            label="Aborted"
            checked={m.aborted}
            onChange={(e) => set(i, { aborted: e.target.checked })}
            disabled={disabled}
          />
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
        <Button type="button" variant="ghost" size="sm" onClick={add} disabled={disabled}>
          Add map
        </Button>
      </div>
    </div>
  );
}
