/**
 * @file src/components/availability/AvailabilityEditor.tsx
 * @desc The availability grid with a save button, for one edition or the player's default. Slots
 *       are picked in `zone` (the zone they last saved in), else the browser's zone.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import { Button, Notice } from "@haruhimemoe/ui";
import { useState } from "react";
import { useViewerZone } from "@/components/edition/LocalTime";
import { postJson } from "@/lib/manage-client";
import { AvailabilityGrid } from "./AvailabilityGrid";

/** AvailabilityEditor's props: the edition (null for the default), the saved zone and slots. */
export type AvailabilityEditorProps = {
  editionId: string | null;
  zone: string | null;
  initial: readonly number[];
};

/**
 * @function AvailabilityEditor
 * @param props {AvailabilityEditorProps} what to edit
 * @returns {JSX.Element} the grid, its zone and a save button
 */
export function AvailabilityEditor({ editionId, zone, initial }: AvailabilityEditorProps) {
  const viewer = useViewerZone(zone);
  const [slots, setSlots] = useState<number[]>([...initial]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  const save = async () => {
    setBusy(true);
    const result = await postJson("/api/availability", { editionId, zone: viewer, slots }, "PUT");
    setBusy(false);
    setNotice(
      result.ok
        ? { tone: "info", text: "Availability saved." }
        : { tone: "error", text: result.message },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-c3 text-sm">Hours in {viewer}. Hosts use these to suggest match times.</p>
      <AvailabilityGrid value={slots} onChange={setSlots} disabled={busy} />
      {notice ? (
        <Notice tone={notice.tone} live>
          {notice.text}
        </Notice>
      ) : null}
      <div>
        <Button type="button" onClick={save} disabled={busy}>
          Save availability
        </Button>
      </div>
    </div>
  );
}
