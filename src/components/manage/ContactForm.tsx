/**
 * @file src/components/manage/ContactForm.tsx
 * @desc How to reach the host: an email and a Discord handle, either optional, shown to players
 *       with a question on the public tournament page (StaffContact). Saves on its own PATCH to
 *       the settings route.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import { Button, Notice, TextInput } from "@haruhimemoe/ui";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { postJson } from "@/lib/manage-client";
import type { Contact } from "@/schemas/social";

/** ContactForm's props: the edition's slugs and its current contact. */
export type ContactFormProps = { lineage: string; edition: string; initial: Contact };

/**
 * @function ContactForm
 * @param props {ContactFormProps} the contact
 * @returns {JSX.Element} the form
 */
export function ContactForm({ lineage, edition, initial }: ContactFormProps) {
  const t = useTranslations("tourney.contactForm");
  const router = useRouter();
  const [email, setEmail] = useState(initial.email ?? "");
  const [discord, setDiscord] = useState(initial.discord ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await postJson(
      `/api/manage/${lineage}/${edition}/settings`,
      { contact: { email: email.trim() || null, discord: discord.trim() || null } },
      "PATCH",
    );
    setBusy(false);
    if (!result.ok) return setNotice({ tone: "error", text: result.message });
    setNotice({ tone: "info", text: t("saved") });
    router.refresh();
  };

  return (
    <form onSubmit={save} className="flex max-w-md flex-col gap-4">
      <TextInput
        id="contact-email"
        label={t("email")}
        type="email"
        hint={t("shownOnThePublic")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy}
      />
      <TextInput
        id="contact-discord"
        label={t("discordHandle")}
        hint={t("howPlayersReachYou")}
        maxLength={40}
        value={discord}
        onChange={(e) => setDiscord(e.target.value)}
        disabled={busy}
      />
      {notice ? (
        <Notice tone={notice.tone} live>
          {notice.text}
        </Notice>
      ) : null}
      <div>
        <Button type="submit" disabled={busy}>
          {t("saveContact")}
        </Button>
      </div>
    </form>
  );
}
