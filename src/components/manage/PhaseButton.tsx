/**
 * @file src/components/manage/PhaseButton.tsx
 * @desc "Move to <phase>": posts the move and refreshes the page, or shows the refusal (the
 *       library's error, through the error map).
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import type { Phase } from "@haruhimemoe/tourney";
import { Button, Notice } from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { postJson } from "@/lib/manage-client";

/** PhaseButton's props: where the edition lives and the phase to offer. */
export type PhaseButtonProps = { lineage: string; edition: string; to: Phase };

/**
 * @function PhaseButton
 * @param props {PhaseButtonProps} the edition and the next phase
 * @returns {JSX.Element} the button and any refusal
 */
export function PhaseButton({ lineage, edition, to }: PhaseButtonProps) {
  const t = useTranslations("tourney");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const move = async () => {
    setBusy(true);
    const result = await postJson(`/api/manage/${lineage}/${edition}/phase`, { to });
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setError(null);
    router.refresh();
  };
  return (
    <div className="flex flex-col gap-2">
      <Button onClick={move} disabled={busy}>
        {t("phaseButton.moveTo", { phase: t(`phase.${to}`) })}
      </Button>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}
