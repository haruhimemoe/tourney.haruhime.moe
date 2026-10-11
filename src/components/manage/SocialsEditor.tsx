/**
 * @file src/components/manage/SocialsEditor.tsx
 * @desc An edition's social links: add (12 at most), reorder by drag, keys or the move buttons
 *       (ui's SortableList), a kind select, its URL, a label when the kind is "custom", remove.
 *       Saves on its own PATCH to the settings route; a 400's issues (ui's postJson passes them
 *       through) point each field error at its row by the issue's array index. Controlled rows
 *       carry a local-only key (the stored Social has none) so SortableList and React both have
 *       a stable identity across reorders.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import { Button, moveItem, Notice, Select, SortableList, TextInput } from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { FieldIssue } from "@/lib/manage-client";
import { postJson } from "@/lib/manage-client";
import { MAX_SOCIALS, SOCIAL_KINDS, type Social } from "@/schemas/social";

/** SocialsEditor's props: where to save and the edition's current socials. */
export type SocialsEditorProps = {
  lineage: string;
  edition: string;
  initial: readonly Social[];
};

/** A row's local identity plus its social fields. */
type Row = Social & { key: string };

/** Each kind's label. */
const KIND_LABELS: Record<Social["kind"], string> = {
  discord: "Discord",
  twitter: "Twitter",
  twitch: "Twitch",
  youtube: "YouTube",
  website: "Website",
  challonge: "Challonge",
  sheets: "Sheets",
  forum: "osu! forum",
  custom: "Custom",
};

/** A row's field errors, keyed by its local key. */
type RowErrors = Record<string, { url?: string; label?: string }>;

const newKey = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const toRows = (socials: readonly Social[]): Row[] => socials.map((s) => ({ ...s, key: newKey() }));

/**
 * @function fieldErrors
 * @param issues {readonly FieldIssue[] | undefined} the route's 400 issues
 * @param rows {readonly Row[]} the rows, in their current order (the path's index is positional)
 * @returns {RowErrors} each affected row's url and label messages
 */
const fieldErrors = (
  issues: readonly FieldIssue[] | undefined,
  rows: readonly Row[],
): RowErrors => {
  const errors: RowErrors = {};
  for (const issue of issues ?? []) {
    const [root, index, field] = issue.path;
    if (root !== "socials" || typeof index !== "number") continue;
    const row = rows[index];
    if (!row || (field !== "url" && field !== "label")) continue;
    errors[row.key] = { ...errors[row.key], [field]: issue.message };
  }
  return errors;
};

/**
 * @function SocialsEditor
 * @param props {SocialsEditorProps} the edition's slugs and its current socials
 * @returns {JSX.Element} the editable list and its save button
 */
export function SocialsEditor({ lineage, edition, initial }: SocialsEditorProps) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const [errors, setErrors] = useState<RowErrors>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const full = rows.length >= MAX_SOCIALS;
  const name = (row: Row) => KIND_LABELS[row.kind];

  const update = (key: string, change: (row: Row) => Row) =>
    setRows((prev) => prev.map((r) => (r.key === key ? change(r) : r)));

  const add = () => {
    if (full) return;
    setRows((prev) => [...prev, { key: newKey(), kind: "discord", url: "", label: null }]);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const socials: Social[] = rows.map(({ key: _key, ...s }) => s);
    const result = await postJson(
      `/api/manage/${lineage}/${edition}/settings`,
      { socials },
      "PATCH",
    );
    setBusy(false);
    if (!result.ok) {
      setErrors(fieldErrors(result.issues, rows));
      setNotice({ tone: "error", text: result.message });
      return;
    }
    setErrors({});
    setNotice({ tone: "info", text: "Saved." });
    router.refresh();
  };

  return (
    <form onSubmit={save} className="flex max-w-2xl flex-col gap-4">
      <SortableList
        items={rows}
        getId={(r) => r.key}
        getLabel={name}
        label="Social links"
        disabled={busy}
        onMove={({ from, to }) => setRows((prev) => moveItem(prev, from.index, to.index))}
        className="flex flex-col gap-3"
      >
        {(row, { index, handle, moveButtons }) => (
          <div className="flex flex-col gap-2 rounded-md border border-b4 p-3">
            <div className="flex flex-wrap items-end gap-2">
              {handle}
              <Select
                id={`social-kind-${row.key}`}
                label={`Kind of social ${index + 1}`}
                value={row.kind}
                onChange={(e) =>
                  update(row.key, (r) => {
                    const kind = e.target.value as Social["kind"];
                    return { ...r, kind, label: kind === "custom" ? r.label : null };
                  })
                }
                disabled={busy}
              >
                {SOCIAL_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {KIND_LABELS[kind]}
                  </option>
                ))}
              </Select>
              <TextInput
                id={`social-url-${row.key}`}
                label="URL"
                value={row.url}
                onChange={(e) => update(row.key, (r) => ({ ...r, url: e.target.value }))}
                error={errors[row.key]?.url}
                wrapperClassName="flex-1"
                disabled={busy}
              />
              {row.kind === "custom" ? (
                <TextInput
                  id={`social-label-${row.key}`}
                  label="Label"
                  maxLength={40}
                  value={row.label ?? ""}
                  onChange={(e) =>
                    update(row.key, (r) => ({ ...r, label: e.target.value || null }))
                  }
                  error={errors[row.key]?.label}
                  disabled={busy}
                />
              ) : null}
              {moveButtons}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${name(row)} link`}
                onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                disabled={busy}
              >
                Remove
              </Button>
            </div>
          </div>
        )}
      </SortableList>
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" onClick={add} disabled={busy || full}>
          Add social
        </Button>
        {full ? <span className="text-c3 text-sm">{MAX_SOCIALS} socials at most.</span> : null}
      </div>
      {notice ? (
        <Notice tone={notice.tone} live>
          {notice.text}
        </Notice>
      ) : null}
      <div>
        <Button type="submit" disabled={busy}>
          Save socials
        </Button>
      </div>
    </form>
  );
}
