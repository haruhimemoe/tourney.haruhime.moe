/**
 * @file src/components/manage/GeneralSettingsForm.tsx
 * @desc An edition's general settings in one save: name, acronym, start and end dates (in the
 *       host's own time zone, stored UTC), rules text, banner, hue and site visibility.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import { Button, Notice, RadioGroup, SectionHeading, Textarea, TextInput } from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { postJson } from "@/lib/manage-client";
import type { Edition, SITE_MODES } from "@/schemas/edition";
import { fromLocalInput, toLocalInput } from "@/utils/local-time";

/** GeneralSettingsForm's props: the edition's slugs and its current general fields. */
export type GeneralSettingsFormProps = {
  lineage: string;
  edition: string;
  initial: Pick<
    Edition,
    "name" | "acronym" | "dates" | "rulesText" | "bannerUrl" | "hue" | "siteMode"
  >;
};

const SITE_MODE_OPTIONS = [
  { value: "auto", label: "Automatic", hint: "Shows once registration opens." },
  { value: "live", label: "Live", hint: "Always shown." },
  { value: "hidden", label: "Hidden", hint: "Only lineage members see it." },
] as const satisfies readonly { value: (typeof SITE_MODES)[number]; label: string; hint: string }[];

const toHue = (text: string): number | null => (/^\d+$/.test(text.trim()) ? Number(text) : null);

/**
 * @function GeneralSettingsForm
 * @param props {GeneralSettingsFormProps} the settings
 * @returns {JSX.Element} the form
 */
export function GeneralSettingsForm({ lineage, edition, initial }: GeneralSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [acronym, setAcronym] = useState(initial.acronym ?? "");
  const [start, setStart] = useState(toLocalInput(initial.dates.start));
  const [end, setEnd] = useState(toLocalInput(initial.dates.end));
  const [rulesText, setRulesText] = useState(initial.rulesText);
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl ?? "");
  const [hue, setHue] = useState(initial.hue?.toString() ?? "");
  const [siteMode, setSiteMode] = useState<(typeof SITE_MODES)[number]>(initial.siteMode);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await postJson(
      `/api/manage/${lineage}/${edition}/settings`,
      {
        name,
        acronym: acronym.trim() || null,
        dates: { start: fromLocalInput(start), end: fromLocalInput(end) },
        rulesText,
        bannerUrl: bannerUrl.trim() || null,
        hue: toHue(hue),
        siteMode,
      },
      "PATCH",
    );
    setBusy(false);
    if (!result.ok) return setNotice({ tone: "error", text: result.message });
    setNotice({ tone: "info", text: "Saved." });
    router.refresh();
  };

  return (
    <form onSubmit={save} className="flex max-w-2xl flex-col gap-6">
      <section className="flex flex-col gap-4">
        <SectionHeading>Name and dates</SectionHeading>
        <div className="flex flex-wrap gap-3">
          <TextInput
            id="general-name"
            label="Edition name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            wrapperClassName="flex-1"
          />
          <TextInput
            id="general-acronym"
            label="Acronym"
            hint="Shown next to the name, 12 characters at most."
            maxLength={12}
            value={acronym}
            onChange={(e) => setAcronym(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <TextInput
            id="general-start"
            label="Starts"
            type="datetime-local"
            hint="In your time zone."
            value={start}
            onChange={(e) => setStart(e.target.value)}
            disabled={busy}
          />
          <TextInput
            id="general-end"
            label="Ends"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            disabled={busy}
          />
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeading>Look</SectionHeading>
        <TextInput
          id="general-banner"
          label="Banner URL"
          type="url"
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
          disabled={busy}
        />
        <TextInput
          id="general-hue"
          label="Hue"
          hint="0 to 359. Empty for the lineage's own."
          inputMode="numeric"
          value={hue}
          onChange={(e) => setHue(e.target.value)}
          disabled={busy}
        />
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeading>Rules</SectionHeading>
        <Textarea
          id="general-rules"
          label="Rules text"
          hint="Markdown."
          rows={8}
          value={rulesText}
          onChange={(e) => setRulesText(e.target.value)}
          disabled={busy}
        />
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeading>Public page</SectionHeading>
        <RadioGroup
          label="Site visibility"
          options={SITE_MODE_OPTIONS}
          value={siteMode}
          onChange={(value) => setSiteMode(value as (typeof SITE_MODES)[number])}
          disabled={busy}
        />
      </section>
      {notice ? (
        <Notice tone={notice.tone} live>
          {notice.text}
        </Notice>
      ) : null}
      <div>
        <Button type="submit" disabled={busy}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
