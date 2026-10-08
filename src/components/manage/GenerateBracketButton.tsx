/**
 * @file src/components/manage/GenerateBracketButton.tsx
 * @desc "Make the bracket" (or "Remake" once one exists): posts and refreshes, or shows the
 *       refusal (seeds missing, results already in).
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import { Button, Notice } from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/manage-client";

/** GenerateBracketButton's props: the edition and whether a bracket exists. */
export type GenerateBracketButtonProps = { lineage: string; edition: string; exists: boolean };

/**
 * @function GenerateBracketButton
 * @param props {GenerateBracketButtonProps} the edition
 * @returns {JSX.Element} the button and any refusal
 */
export function GenerateBracketButton({ lineage, edition, exists }: GenerateBracketButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const make = async () => {
    setBusy(true);
    const result = await postJson(`/api/manage/${lineage}/${edition}/bracket`, {});
    setBusy(false);
    if (!result.ok) return setNotice({ tone: "error", text: result.message });
    setNotice({ tone: "info", text: "Bracket made." });
    router.refresh();
  };
  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button onClick={make} disabled={busy}>
          {exists ? "Remake the bracket" : "Make the bracket"}
        </Button>
      </div>
      {notice ? (
        <Notice tone={notice.tone} live>
          {notice.text}
        </Notice>
      ) : null}
    </div>
  );
}
