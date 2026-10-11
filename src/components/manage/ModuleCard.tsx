/**
 * @file src/components/manage/ModuleCard.tsx
 * @desc One row on the Modules tab: the module's name and description, a checkbox that PUTs the
 *       toggle to /api/manage/[lineage]/modules, and a Settings link once it's both enabled and
 *       carries a settingsUrl. Not optimistic: the checkbox only flips once the route answers
 *       200; a refusal (over the 32-module cap, an id gone stale) shows under the card and the
 *       checkbox stays exactly where it was. Takes a plain ModuleCardDto, not the registry's
 *       TourneyModule: that type carries functions (settingsHref, exportUser, deleteUser) that
 *       can't cross the server/client boundary, so the server page resolves them to plain data
 *       first.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import { Card, Checkbox, Notice } from "@haruhimemoe/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { postJson } from "@/lib/manage-client";
import type { ModuleCardDto } from "@/lib/module-card-dto";

/** ModuleCard's props: the lineage it toggles for and the module's plain, serializable fields. */
export type ModuleCardProps = {
  lineage: string;
  card: ModuleCardDto;
};

/**
 * @function ModuleCard
 * @param props {ModuleCardProps} the lineage and the module's plain card data
 * @returns {JSX.Element} the card
 */
export function ModuleCard({ lineage, card }: ModuleCardProps) {
  const t = useTranslations("tourney.moduleCard");
  const router = useRouter();
  const [enabled, setEnabled] = useState(card.enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (next: boolean) => {
    setBusy(true);
    const result = await postJson(
      `/api/manage/${lineage}/modules`,
      { id: card.id, enabled: next },
      "PUT",
    );
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setError(null);
    setEnabled(next);
    router.refresh();
  };

  return (
    <Card title={card.name} headingLevel={3}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-c3 text-sm">{card.description}</p>
        <Checkbox
          id={`module-${card.id}`}
          label={t("turnNameOn", { name: card.name })}
          hideLabel
          checked={enabled}
          disabled={busy}
          onChange={(e) => toggle(e.target.checked)}
        />
      </div>
      {enabled && card.settingsUrl ? (
        <Link href={card.settingsUrl} className="coarse:inline-block coarse:py-2 text-sm underline">
          {t("settings")}
        </Link>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Card>
  );
}
