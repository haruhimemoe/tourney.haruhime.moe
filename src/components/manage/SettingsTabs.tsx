/**
 * @file src/components/manage/SettingsTabs.tsx
 * @desc The edition's settings tabs as links, the current one from the path.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import { LinkTabs } from "@haruhimemoe/ui";
import { usePathname } from "next/navigation";

/** The tabs after General: their path segment and label. */
export const SETTINGS_TABS = [
  ["socials", "Socials"],
  ["contact", "Contact"],
  ["registration", "Registration"],
  ["modules", "Modules"],
] as const;

/**
 * @function SettingsTabs
 * @param props {{ base: string }} the settings section's path, like
 *        "/manage/egc/egc2026/settings"
 * @returns {JSX.Element} the tab links
 */
export function SettingsTabs({ base }: { base: string }) {
  const path = usePathname();
  return (
    <LinkTabs
      label="Edition settings"
      items={[
        { href: base, label: "General", current: path === base },
        ...SETTINGS_TABS.map(([segment, label]) => ({
          href: `${base}/${segment}`,
          label,
          current: path === `${base}/${segment}`,
        })),
      ]}
    />
  );
}
