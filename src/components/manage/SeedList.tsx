/**
 * @file src/components/manage/SeedList.tsx
 * @desc The edition's seeds: seed from qualifiers, at random from a seed number, or by hand
 *       (type each team's seed). After a qualifier seeding, tied teams are marked so the host
 *       can settle them by hand.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import { Button, Notice, Table, TBody, Td, TextInput, THead, Th } from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/manage-client";

/** SeedList's props: the slugs, the active teams with their seeds, and the stored seed number. */
export type SeedListProps = {
  lineage: string;
  edition: string;
  teams: readonly { id: string; name: string; seed: number | null }[];
  qualifiers: boolean;
  randomSeed: number | null;
};

/**
 * @function SeedList
 * @param props {SeedListProps} the teams
 * @returns {JSX.Element} the seeding actions and the seed table
 */
export function SeedList({ lineage, edition, teams, qualifiers, randomSeed }: SeedListProps) {
  const router = useRouter();
  const [seeds, setSeeds] = useState<Record<string, string>>(() =>
    Object.fromEntries(teams.map((t) => [t.id, t.seed?.toString() ?? ""])),
  );
  const [number, setNumber] = useState(randomSeed?.toString() ?? "");
  const [tied, setTied] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const url = `/api/manage/${lineage}/${edition}/seeds`;
  const sorted = [...teams].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));

  const send = async (body: unknown) => {
    setBusy(true);
    const result = await postJson<{
      result: { teamId?: string; entrantId?: string; seed: number; tied?: boolean }[];
    }>(url, body, "PUT");
    setBusy(false);
    if (!result.ok) return setNotice({ tone: "error", text: result.message });
    const rows = Array.isArray(result.data.result) ? result.data.result : [];
    if (rows.length) {
      setSeeds(
        Object.fromEntries(rows.map((r) => [r.teamId ?? r.entrantId ?? "", String(r.seed)])),
      );
    }
    setTied(rows.filter((r) => r.tied).map((r) => r.entrantId ?? ""));
    setNotice({ tone: "info", text: "Seeds saved." });
    router.refresh();
  };

  const manual = () =>
    send({
      method: "manual",
      seeds: teams.map((t) => ({ teamId: t.id, seed: Number(seeds[t.id]) })),
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        {qualifiers ? (
          <Button type="button" onClick={() => send({ method: "qualifiers" })} disabled={busy}>
            Seed from qualifiers
          </Button>
        ) : null}
        <TextInput
          id="random-seed"
          label="Seed number"
          hint="The same number always gives the same order."
          inputMode="numeric"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          disabled={busy}
        />
        <Button
          type="button"
          variant="ghost"
          onClick={() => send({ method: "random", seed: Number(number) })}
          disabled={busy || !/^\d+$/.test(number)}
        >
          Seed at random
        </Button>
      </div>
      {notice ? (
        <Notice tone={notice.tone} live>
          {notice.text}
        </Notice>
      ) : null}
      {tied.length > 0 ? (
        <Notice tone="error">
          Some teams tied. Marked below: settle them by hand if you need to.
        </Notice>
      ) : null}
      <Table caption="Seeds" hideCaption>
        <THead>
          <tr>
            <Th>Seed</Th>
            <Th>Team</Th>
          </tr>
        </THead>
        <TBody>
          {sorted.map((t) => (
            <tr key={t.id}>
              <Td>
                <TextInput
                  id={`seed-${t.id}`}
                  label={`Seed of ${t.name}`}
                  hideLabel
                  inputMode="numeric"
                  value={seeds[t.id] ?? ""}
                  onChange={(e) => setSeeds((prev) => ({ ...prev, [t.id]: e.target.value }))}
                  disabled={busy}
                />
              </Td>
              <Td>
                {t.name}
                {tied.includes(t.id) ? " (tied)" : ""}
              </Td>
            </tr>
          ))}
        </TBody>
      </Table>
      <div>
        <Button type="button" variant="ghost" onClick={manual} disabled={busy}>
          Save seeds as typed
        </Button>
      </div>
    </div>
  );
}
