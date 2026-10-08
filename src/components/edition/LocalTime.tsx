/**
 * @file src/components/edition/LocalTime.tsx
 * @desc An instant in the viewer's zone: the given zone (their profile's), else UTC from the
 *       server, swapped to the browser's zone after mount. Always a `<time dateTime>`, so the
 *       instant reads without JavaScript too.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import { useEffect, useState } from "react";
import { formatTime } from "@/utils/zoned-time";

/** LocalTime's props: the instant, and the viewer's zone when the server knows it. */
export type LocalTimeProps = { at: string; zone?: string | null | undefined };

/**
 * @function useViewerZone
 * @param zone {string | null | undefined} the zone the server knows, if any
 * @returns {string} that zone, else "UTC" until mounted, then the browser's
 */
export const useViewerZone = (zone?: string | null): string => {
  const [viewer, setViewer] = useState(zone ?? "UTC");
  useEffect(() => {
    if (!zone) setViewer(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [zone]);
  return viewer;
};

/**
 * @function LocalTime
 * @param props {LocalTimeProps} the instant and zone
 * @returns {JSX.Element} the time element
 */
export function LocalTime({ at, zone }: LocalTimeProps) {
  const viewer = useViewerZone(zone);
  return (
    <time dateTime={at} title={at}>
      {formatTime(at, viewer)}
      {viewer === "UTC" ? " UTC" : ""}
    </time>
  );
}
