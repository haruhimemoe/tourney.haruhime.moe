/**
 * @file src/components/edition/LocalTime.tsx
 * @desc An instant in the viewer's zone: the given zone (the hub's preference, falling back to
 *       the profile's), else UTC from the server, swapped to the browser's zone after mount.
 *       The hour cycle is the hub's preference alone: null isn't the browser's locale deciding,
 *       it's formatInstant's pinned "en-US" default (12-hour, AM/PM), the same on server and
 *       client. Always a `<time dateTime>`, so the instant reads without JavaScript too.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import { formatInstant } from "@haruhimemoe/next-kit/preferences";
import { useEffect, useState } from "react";

/** LocalTime's props: the instant, the viewer's zone and hour cycle when the server knows them. */
export type LocalTimeProps = {
  at: string;
  zone?: string | null | undefined;
  hourCycle?: "h12" | "h23" | null | undefined;
};

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
 * @param props {LocalTimeProps} the instant, zone and hour cycle
 * @returns {JSX.Element} the time element
 */
export function LocalTime({ at, zone, hourCycle }: LocalTimeProps) {
  const viewer = useViewerZone(zone);
  return (
    <time dateTime={at} title={at}>
      {formatInstant(at, { timeZone: viewer, hourCycle: hourCycle ?? null })}
      {viewer === "UTC" ? " UTC" : ""}
    </time>
  );
}
