/**
 * @file src/components/manage/CreateEditionForm.tsx
 * @desc The create form on /manage/new: a lineage the host already runs, or a new one (name and
 *       address), then the edition's name, code (its address previewed), mode, team size and
 *       year. Posts the lineage first when it's new, then the edition, then opens its page;
 *       a refusal shows its message.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

"use client";

import type { MODES } from "@haruhimemoe/tourney";
import { Button, Notice, SegmentedControl, Select, TextInput } from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { MODE_LABELS, SIDE_PRESETS } from "@/constants/manage";
import { postJson } from "@/lib/manage-client";
import { editionSlug } from "@/schemas/edition";

/** CreateEditionForm's props: the lineages the host runs and the default year. */
export type CreateEditionFormProps = {
  lineages: readonly { slug: string; name: string }[];
  year: number;
};

const NEW = "";

type Mode = (typeof MODES)[number];

/**
 * @function CreateEditionForm
 * @param props {CreateEditionFormProps} the host's lineages and this year
 * @returns {JSX.Element} the form
 */
export function CreateEditionForm({ lineages, year: thisYear }: CreateEditionFormProps) {
  const router = useRouter();
  const [lineage, setLineage] = useState(lineages[0]?.slug ?? NEW);
  const [seriesName, setSeriesName] = useState("");
  const [seriesSlug, setSeriesSlug] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<Mode>("osu");
  const [preset, setPreset] = useState("1v1");
  const [year, setYear] = useState(String(thisYear));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sides = (SIDE_PRESETS.find((p) => p.value === preset) ?? SIDE_PRESETS[0])?.sides;
  const target = lineage === NEW ? seriesSlug : lineage;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sides) return;
    setBusy(true);
    setError(null);
    if (lineage === NEW) {
      const made = await postJson("/api/manage/lineages", {
        slug: seriesSlug,
        name: seriesName,
        description: "",
        defaults: { mode, sides, rulesText: "" },
      });
      if (!made.ok) {
        setBusy(false);
        setError(made.message);
        return;
      }
    }
    const edition = await postJson<{ edition: { slug: string } }>(
      `/api/manage/${target}/editions`,
      { name, code, mode, sides, year: Number(year), dates: { start: null, end: null } },
    );
    setBusy(false);
    if (!edition.ok) return setError(edition.message);
    router.push(`/manage/${target}/${edition.data.edition.slug}`);
  };

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4">
      <Select
        id="lineage"
        label="Series"
        value={lineage}
        onChange={(e) => setLineage(e.target.value)}
      >
        {lineages.map((l) => (
          <option key={l.slug} value={l.slug}>
            {l.name}
          </option>
        ))}
        <option value={NEW}>A new series</option>
      </Select>
      {lineage === NEW ? (
        <>
          <TextInput
            id="series-name"
            label="Series name"
            value={seriesName}
            onChange={(e) => setSeriesName(e.target.value)}
            required
            maxLength={80}
          />
          <TextInput
            id="series-slug"
            label="Series address"
            hint="3 to 40 lowercase letters, numbers and dashes."
            value={seriesSlug}
            onChange={(e) => setSeriesSlug(e.target.value.toLowerCase())}
            required
            maxLength={40}
          />
        </>
      ) : null}
      <TextInput
        id="edition-name"
        label="Edition name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={128}
      />
      <TextInput
        id="edition-code"
        label="Code"
        hint={
          <span className="font-mono">{`/${target || "series"}/${editionSlug(code) || "code"}`}</span>
        }
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
        maxLength={16}
      />
      <Select id="mode" label="Mode" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
        {Object.entries(MODE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <SegmentedControl
        label="Team size"
        options={SIDE_PRESETS}
        value={preset}
        onChange={setPreset}
      />
      <TextInput
        id="year"
        label="Year"
        type="number"
        min={2007}
        max={2100}
        value={year}
        onChange={(e) => setYear(e.target.value)}
        required
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={busy}>
        Create edition
      </Button>
    </form>
  );
}
