/**
 * @file src/components/edition/EditionTabs.tsx
 * @desc The public edition's tabs as links, the current one from the path.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import { LinkTabs } from "@haruhimemoe/ui";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("tourney.editionTabs");
  const path = usePathname();
  return (
    <LinkTabs
      label={t("edition")}
      items={[
        { href: base, label: t("overview"), current: path === base },
        ...EDITION_TABS.map(([segment]) => ({
          href: `${base}/${segment}`,
          label: t(`tabs.${segment}`),
          current: path === `${base}/${segment}`,
        })),
      ]}
    />
  );
}
