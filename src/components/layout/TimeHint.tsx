/**
 * @file src/components/layout/TimeHint.tsx
 * @desc A line saying what zone and hour format times on this page use, linking to the hub's
 *       account settings where a signed-in viewer can change them. Shown in the manage and
 *       dashboard headers, where times are everywhere and worth explaining once. hourCycle null
 *       isn't "the browser decides": formatInstant pins "en-US", whose default is 12-hour with
 *       AM/PM, so that's the label for null too.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import { useTranslations } from "next-intl";
import { useViewerZone } from "@/components/edition/LocalTime";

const HUB_TIME_SETTINGS_URL = "https://haruhime.moe/account#time";

/** TimeHint's props: the viewer's zone and hour cycle when known. */
export type TimeHintProps = {
  zone?: string | null | undefined;
  hourCycle?: "h12" | "h23" | null | undefined;
};

/**
 * @function TimeHint
 * @param props {TimeHintProps} the viewer's zone and hour cycle
 * @returns {JSX.Element} "Times in <zone>, <hour format>." linking to the hub's account page
 */
export function TimeHint({ zone, hourCycle }: TimeHintProps) {
  const t = useTranslations("tourney.time");
  const viewer = useViewerZone(zone);
  return (
    <p className="text-c3 text-sm">
      {t("hint", { zone: viewer, cycle: hourCycle ?? "h12" })}{" "}
      <a href={HUB_TIME_SETTINGS_URL} className="underline">
        {t("change")}
      </a>
    </p>
  );
}
