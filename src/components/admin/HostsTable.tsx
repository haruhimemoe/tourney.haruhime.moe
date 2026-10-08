/**
 * @file src/components/admin/HostsTable.tsx
 * @desc The verified hosts list for haruhime admins: each host with a remove button, and a box
 *       to verify another by osu! id.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import { Button, Notice, Table, TBody, Td, TextInput, TextLink, THead, Th } from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/manage-client";
import type { VerifiedHost } from "@/services/hosts";

/**
 * @function HostsTable
 * @param props {{ hosts: readonly VerifiedHost[] }} the verified hosts
 * @returns {JSX.Element} the list and the verify box
 */
export function HostsTable({ hosts }: { hosts: readonly VerifiedHost[] }) {
  const router = useRouter();
  const [osuId, setOsuId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  const send = async (id: number, verified: boolean, label: string) => {
    setBusy(true);
    const result = await postJson("/api/admin/hosts", { osuId: id, verified }, "PUT");
    setBusy(false);
    if (!result.ok) return setNotice({ tone: "error", text: result.message });
    setNotice({
      tone: "info",
      text: verified ? `${label} is verified.` : `${label} is no longer verified.`,
    });
    if (verified) setOsuId("");
    router.refresh();
  };

  const typed = /^\d+$/.test(osuId.trim()) ? Number(osuId) : null;

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (typed) void send(typed, true, String(typed));
        }}
      >
        <TextInput
          id="host-osu-id"
          label="osu! id"
          inputMode="numeric"
          value={osuId}
          onChange={(e) => setOsuId(e.target.value)}
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !typed}>
          Verify
        </Button>
      </form>
      {notice ? (
        <Notice tone={notice.tone} live>
          {notice.text}
        </Notice>
      ) : null}
      {hosts.length ? (
        <Table caption="Verified hosts" hideCaption>
          <THead>
            <tr>
              <Th>Host</Th>
              <Th>osu! id</Th>
              <Th>Action</Th>
            </tr>
          </THead>
          <TBody>
            {hosts.map((h) => {
              const name = h.username ?? h.userId;
              return (
                <tr key={h.userId} aria-label={name}>
                  <Td>
                    {h.osuId ? (
                      <TextLink href={`https://osu.ppy.sh/users/${h.osuId}`} variant="plain">
                        {name}
                      </TextLink>
                    ) : (
                      name
                    )}
                  </Td>
                  <Td className="tabular-nums">{h.osuId ?? "-"}</Td>
                  <Td>
                    {h.osuId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${name}`}
                        onClick={() => void send(h.osuId as number, false, name)}
                        disabled={busy}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </Td>
                </tr>
              );
            })}
          </TBody>
        </Table>
      ) : (
        <p className="text-c3">No verified hosts yet.</p>
      )}
    </div>
  );
}
