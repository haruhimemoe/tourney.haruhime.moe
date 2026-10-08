/**
 * @file src/components/edition/EditionTabs.tsx
 * @desc The public edition's tabs as links, the current one from the path.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import { LinkTabs } from "@haruhimemoe/ui";
import { usePathname } from "next/navigation";

/** The tabs after Overview: their path segment and label. */
export const EDITION_TABS = [
  ["bracket", "Bracket"],
  ["schedule", "Schedule"],
  ["teams", "Teams"],
  ["pools", "Pools"],
  ["results", "Results"],
] as const;

/**
 * @function EditionTabs
 * @param props {{ base: string }} the edition's path, like "/egc/egc2026"
 * @returns {JSX.Element} the tab links
 */
export function EditionTabs({ base }: { base: string }) {
  const path = usePathname();
  return (
    <LinkTabs
      label="Edition"
      items={[
        { href: base, label: "Overview", current: path === base },
        ...EDITION_TABS.map(([segment, label]) => ({
          href: `${base}/${segment}`,
          label,
          current: path === `${base}/${segment}`,
        })),
      ]}
    />
  );
}
