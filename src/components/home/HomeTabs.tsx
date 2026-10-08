/**
 * @file src/components/home/HomeTabs.tsx
 * @desc The signed-in home's tabs: Playing and Hosting, each only when it has content. One tab
 *       shows without a tab list.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import { Tabs, tabId, tabPanelId } from "@haruhimemoe/ui";
import { type ReactNode, useState } from "react";

type TabId = "playing" | "hosting";

/** HomeTabs' props: each tab's content, or null when it has none. */
export type HomeTabsProps = { playing: ReactNode | null; hosting: ReactNode | null };

const PREFIX = "home";

/**
 * @function HomeTabs
 * @param props {HomeTabsProps} the tabs' content
 * @returns {JSX.Element} the tab list and the chosen panel
 */
export function HomeTabs({ playing, hosting }: HomeTabsProps) {
  const tabs = [
    ...(playing ? [{ id: "playing" as const, label: "Playing", content: playing }] : []),
    ...(hosting ? [{ id: "hosting" as const, label: "Hosting", content: hosting }] : []),
  ];
  const [value, setValue] = useState<TabId>(tabs[0]?.id ?? "playing");
  const current = tabs.find((t) => t.id === value) ?? tabs[0];
  if (!current) return null;
  if (tabs.length === 1) return <div>{current.content}</div>;
  return (
    <div className="flex flex-col gap-4">
      <Tabs
        label="Your tournaments"
        idPrefix={PREFIX}
        tabs={tabs.map(({ id, label }) => ({ id, label }))}
        value={current.id}
        onChange={setValue}
      />
      <div
        role="tabpanel"
        id={tabPanelId(PREFIX, current.id)}
        aria-labelledby={tabId(PREFIX, current.id)}
      >
        {current.content}
      </div>
    </div>
  );
}
