/**
 * @file src/components/manage/RegistrationSettingsForm.tsx
 * @desc Registration settings in one save: the window (in the host's own time zone, stored UTC),
 *       the caps, the questions and eligibility.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import { Button, Notice, SectionHeading, TextInput } from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { postJson } from "@/lib/manage-client";
import type { Edition } from "@/schemas/edition";
import type { Question } from "@/schemas/question";
import { fromLocalInput, toLocalInput } from "@/utils/local-time";
import { EligibilityForm } from "./EligibilityForm";
import { QuestionBuilder } from "./QuestionBuilder";

/** RegistrationSettingsForm's props: the edition's slugs and its current settings. */
export type RegistrationSettingsFormProps = {
  lineage: string;
  edition: string;
  initial: Pick<Edition, "registration" | "questions" | "eligibility">;
};

const toCap = (text: string): number | null => (/^\d+$/.test(text.trim()) ? Number(text) : null);

/**
 * @function RegistrationSettingsForm
 * @param props {RegistrationSettingsFormProps} the settings
 * @returns {JSX.Element} the form
 */
export function RegistrationSettingsForm({
  lineage,
  edition,
  initial,
}: RegistrationSettingsFormProps) {
  const t = useTranslations("tourney.registrationSettingsForm");
  const router = useRouter();
  const [opensAt, setOpensAt] = useState(toLocalInput(initial.registration.opensAt));
  const [closesAt, setClosesAt] = useState(toLocalInput(initial.registration.closesAt));
  const [playerCap, setPlayerCap] = useState(initial.registration.playerCap?.toString() ?? "");
  const [questions, setQuestions] = useState<Question[]>([...initial.questions]);
  const [eligibility, setEligibility] = useState(initial.eligibility);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await postJson(
      `/api/manage/${lineage}/${edition}/settings`,
      {
        registration: {
          ...initial.registration,
          opensAt: fromLocalInput(opensAt),
          closesAt: fromLocalInput(closesAt),
          playerCap: toCap(playerCap),
        },
        questions,
        eligibility,
      },
      "PATCH",
    );
    setBusy(false);
    if (!result.ok) return setNotice({ tone: "error", text: result.message });
    setNotice({ tone: "info", text: t("saved") });
    router.refresh();
  };

  return (
    <form onSubmit={save} className="flex max-w-2xl flex-col gap-6">
      <section className="flex flex-col gap-4">
        <SectionHeading>{t("windowAndCap")}</SectionHeading>
        <div className="flex flex-wrap gap-3">
          <TextInput
            id="opens-at"
            label={t("opens")}
            type="datetime-local"
            hint={t("inYourTimeZone")}
            value={opensAt}
            onChange={(e) => setOpensAt(e.target.value)}
            disabled={busy}
          />
          <TextInput
            id="closes-at"
            label={t("closes")}
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            disabled={busy}
          />
          <TextInput
            id="player-cap"
            label={t("playerCap")}
            hint={t("pastItPlayersJoin")}
            inputMode="numeric"
            value={playerCap}
            onChange={(e) => setPlayerCap(e.target.value)}
            disabled={busy}
          />
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeading>{t("questions")}</SectionHeading>
        <QuestionBuilder value={questions} onChange={setQuestions} disabled={busy} />
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeading>{t("eligibility")}</SectionHeading>
        <EligibilityForm value={eligibility} onChange={setEligibility} disabled={busy} />
      </section>
      {notice ? (
        <Notice tone={notice.tone} live>
          {notice.text}
        </Notice>
      ) : null}
      <div>
        <Button type="submit" disabled={busy}>
          {t("saveSettings")}
        </Button>
      </div>
    </form>
  );
}
