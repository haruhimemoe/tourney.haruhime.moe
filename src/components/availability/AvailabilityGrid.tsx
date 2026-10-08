/**
 * @file src/components/availability/AvailabilityGrid.tsx
 * @desc A week of hours in the viewer's zone: 7 day columns by 24 hour rows, each cell a toggle
 *       button. Click or drag to set or clear a run, arrow keys to move, space to toggle. Slots
 *       are local week slots (day * 24 + hour, Monday 0); the caller converts and saves.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

"use client";

import { type KeyboardEvent, useEffect, useRef } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MOVES: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

/** AvailabilityGrid's props: the picked local slots and what to call when they change. */
export type AvailabilityGridProps = {
  value: readonly number[];
  onChange: (slots: number[]) => void;
  disabled?: boolean;
};

const pad = (hour: number) => String(hour).padStart(2, "0");

/**
 * @function AvailabilityGrid
 * @param props {AvailabilityGridProps} the slots and the change handler
 * @returns {JSX.Element} the grid
 */
export function AvailabilityGrid({ value, onChange, disabled = false }: AvailabilityGridProps) {
  const picked = new Set(value);
  const drag = useRef<{ on: boolean; slots: Set<number> } | null>(null);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const end = () => {
      drag.current = null;
    };
    window.addEventListener("pointerup", end);
    return () => window.removeEventListener("pointerup", end);
  }, []);

  const apply = (slot: number, on: boolean, base: ReadonlySet<number>) => {
    const next = new Set(base);
    if (on) next.add(slot);
    else next.delete(slot);
    onChange([...next].sort((a, b) => a - b));
    return next;
  };

  const startDrag = (slot: number) => {
    if (disabled) return;
    const on = !picked.has(slot);
    drag.current = { on, slots: apply(slot, on, picked) };
  };

  const enter = (slot: number) => {
    const d = drag.current;
    if (d && !disabled) d.slots = apply(slot, d.on, d.slots);
  };

  const key = (event: KeyboardEvent<HTMLButtonElement>, day: number, hour: number) => {
    const move = MOVES[event.key];
    if (move) {
      event.preventDefault();
      const d = Math.min(6, Math.max(0, day + move[0]));
      const h = Math.min(23, Math.max(0, hour + move[1]));
      cells.current[d * 24 + h]?.focus();
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      const slot = day * 24 + hour;
      if (!disabled) apply(slot, !picked.has(slot), picked);
    }
  };

  return (
    <table className="w-full border-separate border-spacing-px select-none text-xs">
      <caption className="sr-only">Weekly availability</caption>
      <thead>
        <tr>
          <td />
          {DAYS.map((d) => (
            <th key={d} scope="col" className="text-center font-bold text-c2">
              {d}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {HOURS.map((hour) => (
          <tr key={hour}>
            <th scope="row" className="pr-2 text-right font-normal text-c3 tabular-nums">
              {pad(hour)}
            </th>
            {DAYS.map((name, day) => {
              const slot = day * 24 + hour;
              const on = picked.has(slot);
              return (
                <td key={slot} className="p-0">
                  <button
                    ref={(el) => {
                      cells.current[slot] = el;
                    }}
                    type="button"
                    aria-label={`${name} ${pad(hour)}:00`}
                    aria-pressed={on}
                    disabled={disabled}
                    tabIndex={slot === 0 ? 0 : -1}
                    onPointerDown={() => startDrag(slot)}
                    onPointerEnter={() => enter(slot)}
                    onKeyDown={(e) => key(e, day, hour)}
                    className={`block h-5 w-full rounded-sm ${on ? "bg-h1" : "bg-b3"} focus-visible:outline-2 focus-visible:outline-h1`}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
