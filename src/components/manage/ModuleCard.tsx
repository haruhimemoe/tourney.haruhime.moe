/**
 * @file src/components/manage/ModuleCard.tsx
 * @desc One row on the Modules tab: the module's name and description, a checkbox that PUTs the
 *       toggle to /api/manage/[lineage]/modules, and a Settings link once it's both enabled and
 *       carries a settingsHref. The switch reverts and shows the route's refusal (over the
 *       32-module cap, an id gone stale) rather than staying in a state the server didn't save.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import { Card, Checkbox, Notice } from "@haruhimemoe/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/manage-client";
import type { TourneyModule } from "@/modules/types";

/** ModuleCard's props: the lineage it toggles for, the module, its current state, and the base
 *  URL passed to the module's settingsHref. */
export type ModuleCardProps = {
  lineage: string;
  module: TourneyModule;
  enabled: boolean;
  /** Passed to `module.settingsHref(base)`; the Modules tab's own path for this edition. */
  base: string;
};

/**
 * @function ModuleCard
 * @param props {ModuleCardProps} the lineage, module, its state and the settings link's base
 * @returns {JSX.Element} the card
 */
export function ModuleCard({ lineage, module, enabled: initial, base }: ModuleCardProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (next: boolean) => {
    setBusy(true);
    const result = await postJson(
      `/api/manage/${lineage}/modules`,
      { id: module.id, enabled: next },
      "PUT",
    );
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setError(null);
    setEnabled(next);
    router.refresh();
  };

  return (
    <Card title={module.name} headingLevel={3}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-c3 text-sm">{module.description}</p>
        <Checkbox
          id={`module-${module.id}`}
          label={`Turn ${module.name} on`}
          hideLabel
          checked={enabled}
          disabled={busy}
          onChange={(e) => toggle(e.target.checked)}
        />
      </div>
      {enabled && module.settingsHref ? (
        <Link
          href={module.settingsHref(base)}
          className="coarse:inline-block coarse:py-2 text-sm underline"
        >
          Settings
        </Link>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Card>
  );
}
