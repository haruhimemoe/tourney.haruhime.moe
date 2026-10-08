/**
 * @file src/components/manage/RoundsEditor.tsx
 * @desc The bracket config (format, size, reset or third place, seeding, qualifiers) and the
 *       rounds built from it: name, best-of, play window in the host's own time, the pool id on
 *       pools.haruhime.moe (with a link to check it) and whether that link shows yet. The config
 *       and the rounds save separately, since a new size can drop rounds.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import {
  Button,
  Checkbox,
  Notice,
  SectionHeading,
  Select,
  Table,
  TBody,
  Td,
  TextInput,
  TextLink,
  THead,
  Th,
} from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/manage-client";
import type { BracketConfig, Edition } from "@/schemas/edition";
import type { StoredRound } from "@/schemas/round";
import { fromLocalInput, toLocalInput } from "@/utils/local-time";

/** RoundsEditor's props: the edition's slugs, its config and its rounds. */
export type RoundsEditorProps = {
  lineage: string;
  edition: string;
  config: BracketConfig | null;
  qualifiers: Edition["qualifiers"];
  rounds: readonly StoredRound[];
  poolsUrl: string;
};

type RoundDraft = {
  code: string;
  name: string;
  bestOf: string;
  start: string;
  end: string;
  poolId: string;
  poolRevealed: boolean;
};

const DEFAULT_CONFIG: BracketConfig = {
  format: "double",
  size: 16,
  bestOf: { default: 7 },
  thirdPlace: false,
  grandFinalReset: true,
  seeding: "manual",
  randomSeed: null,
};

const draftOf = (r: StoredRound): RoundDraft => ({
  code: r.code,
  name: r.name,
  bestOf: r.bestOf?.toString() ?? "",
  start: toLocalInput(r.window?.start ?? null),
  end: toLocalInput(r.window?.end ?? null),
  poolId: r.poolId ?? "",
  poolRevealed: r.poolRevealed,
});

const patchOf = (d: RoundDraft) => {
  const start = fromLocalInput(d.start);
  const end = fromLocalInput(d.end);
  return {
    code: d.code,
    patch: {
      name: d.name.trim() || d.code,
      ...(/^\d+$/.test(d.bestOf) ? { bestOf: Number(d.bestOf) } : {}),
      window: start && end ? { start, end } : null,
      poolId: d.poolId.trim() || null,
      poolRevealed: d.poolRevealed,
    },
  };
};

/**
 * @function RoundsEditor
 * @param props {RoundsEditorProps} the config and rounds
 * @returns {JSX.Element} the config form and the rounds table
 */
export function RoundsEditor({
  lineage,
  edition,
  config,
  qualifiers,
  rounds,
  poolsUrl,
}: RoundsEditorProps) {
  const router = useRouter();
  const [bracket, setBracket] = useState<BracketConfig>(config ?? DEFAULT_CONFIG);
  const [quals, setQuals] = useState(qualifiers);
  const [size, setSize] = useState(String((config ?? DEFAULT_CONFIG).size));
  const [defaultBestOf, setDefaultBestOf] = useState(
    String((config ?? DEFAULT_CONFIG).bestOf.default ?? 7),
  );
  const [drafts, setDrafts] = useState<RoundDraft[]>(rounds.map(draftOf));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const url = `/api/manage/${lineage}/${edition}/rounds`;

  const send = async (body: unknown) => {
    setBusy(true);
    const result = await postJson<{ rounds: StoredRound[] }>(url, body, "PUT");
    setBusy(false);
    if (!result.ok) return setNotice({ tone: "error", text: result.message });
    setDrafts(result.data.rounds.map(draftOf));
    setNotice({ tone: "info", text: "Saved." });
    router.refresh();
  };

  const saveConfig = () =>
    send({
      bracket: {
        ...bracket,
        size: Number(size) || bracket.size,
        bestOf: { ...bracket.bestOf, default: Number(defaultBestOf) || 7 },
      },
      qualifiers: quals,
    });

  const setDraft = (code: string, change: Partial<RoundDraft>) =>
    setDrafts((prev) => prev.map((d) => (d.code === code ? { ...d, ...change } : d)));

  return (
    <div className="flex flex-col gap-8">
      <section className="flex max-w-2xl flex-col gap-4">
        <SectionHeading>Bracket</SectionHeading>
        <div className="flex flex-wrap gap-3">
          <Select
            id="format"
            label="Format"
            value={bracket.format}
            onChange={(e) =>
              setBracket({ ...bracket, format: e.target.value as BracketConfig["format"] })
            }
            disabled={busy}
          >
            <option value="double">Double elimination</option>
            <option value="single">Single elimination</option>
          </Select>
          <TextInput
            id="size"
            label="Entrants"
            hint="2 to 256. Byes fill up to the next power of two."
            inputMode="numeric"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            disabled={busy}
          />
          <TextInput
            id="default-best-of"
            label="Default best-of"
            inputMode="numeric"
            value={defaultBestOf}
            onChange={(e) => setDefaultBestOf(e.target.value)}
            disabled={busy}
          />
          <Select
            id="seeding"
            label="Seeding"
            value={bracket.seeding}
            onChange={(e) =>
              setBracket({ ...bracket, seeding: e.target.value as BracketConfig["seeding"] })
            }
            disabled={busy}
          >
            <option value="manual">By hand</option>
            <option value="qualifiers">From qualifiers</option>
            <option value="random">Random</option>
          </Select>
        </div>
        {bracket.format === "double" ? (
          <Checkbox
            id="reset"
            label="Grand final reset"
            checked={bracket.grandFinalReset}
            onChange={(e) => setBracket({ ...bracket, grandFinalReset: e.target.checked })}
            disabled={busy}
          />
        ) : (
          <Checkbox
            id="third"
            label="Third place match"
            checked={bracket.thirdPlace}
            onChange={(e) => setBracket({ ...bracket, thirdPlace: e.target.checked })}
            disabled={busy}
          />
        )}
        <div className="flex flex-wrap items-end gap-3">
          <Checkbox
            id="qualifiers"
            label="Qualifiers"
            checked={quals.enabled}
            onChange={(e) => setQuals({ ...quals, enabled: e.target.checked })}
            disabled={busy}
          />
          {quals.enabled ? (
            <Select
              id="qualifier-method"
              label="Qualifier ranking"
              value={quals.method}
              onChange={(e) =>
                setQuals({ ...quals, method: e.target.value as Edition["qualifiers"]["method"] })
              }
              disabled={busy}
            >
              <option value="sum">Total score</option>
              <option value="average-rank">Average rank per map</option>
            </Select>
          ) : null}
        </div>
        <div>
          <Button type="button" onClick={saveConfig} disabled={busy}>
            Save bracket and rebuild rounds
          </Button>
        </div>
      </section>
      {notice ? (
        <Notice tone={notice.tone} live>
          {notice.text}
        </Notice>
      ) : null}
      {drafts.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionHeading>Rounds</SectionHeading>
          <p className="text-c3 text-sm">Windows are in your time zone.</p>
          <Table caption="Rounds" hideCaption>
            <THead>
              <tr>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Best of</Th>
                <Th>Window start</Th>
                <Th>Window end</Th>
                <Th>Pool id</Th>
                <Th>Pool shown</Th>
              </tr>
            </THead>
            <TBody>
              {drafts.map((d) => (
                <tr key={d.code}>
                  <Td>{d.code}</Td>
                  <Td>
                    <TextInput
                      id={`name-${d.code}`}
                      label={`Name of ${d.code}`}
                      hideLabel
                      value={d.name}
                      maxLength={64}
                      onChange={(e) => setDraft(d.code, { name: e.target.value })}
                      disabled={busy}
                    />
                  </Td>
                  <Td>
                    {d.code === "Q" ? (
                      "-"
                    ) : (
                      <TextInput
                        id={`bestof-${d.code}`}
                        label={`Best-of of ${d.code}`}
                        hideLabel
                        inputMode="numeric"
                        value={d.bestOf}
                        onChange={(e) => setDraft(d.code, { bestOf: e.target.value })}
                        disabled={busy}
                      />
                    )}
                  </Td>
                  <Td>
                    <TextInput
                      id={`start-${d.code}`}
                      label={`Window start of ${d.code}`}
                      hideLabel
                      type="datetime-local"
                      value={d.start}
                      onChange={(e) => setDraft(d.code, { start: e.target.value })}
                      disabled={busy}
                    />
                  </Td>
                  <Td>
                    <TextInput
                      id={`end-${d.code}`}
                      label={`Window end of ${d.code}`}
                      hideLabel
                      type="datetime-local"
                      value={d.end}
                      onChange={(e) => setDraft(d.code, { end: e.target.value })}
                      disabled={busy}
                    />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <TextInput
                        id={`pool-${d.code}`}
                        label={`Pool id of ${d.code}`}
                        hideLabel
                        value={d.poolId}
                        maxLength={64}
                        onChange={(e) => setDraft(d.code, { poolId: e.target.value })}
                        disabled={busy}
                      />
                      {d.poolId.trim() ? (
                        <TextLink href={`${poolsUrl}/pools/${encodeURIComponent(d.poolId.trim())}`}>
                          Check
                        </TextLink>
                      ) : null}
                    </div>
                  </Td>
                  <Td>
                    <Checkbox
                      id={`revealed-${d.code}`}
                      label={`Show the pool of ${d.code}`}
                      hideLabel
                      checked={d.poolRevealed}
                      onChange={(e) => setDraft(d.code, { poolRevealed: e.target.checked })}
                      disabled={busy}
                    />
                  </Td>
                </tr>
              ))}
            </TBody>
          </Table>
          <div>
            <Button
              type="button"
              onClick={() => send({ rounds: drafts.map(patchOf) })}
              disabled={busy}
            >
              Save rounds
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
