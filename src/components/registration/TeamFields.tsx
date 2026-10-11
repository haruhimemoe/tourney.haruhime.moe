/**
 * @file src/components/registration/TeamFields.tsx
 * @desc A captain's team: name, tag, and teammates' osu! ids. No invites in v0: teammates are
 *       listed, and the host's approval is the check.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import { TextInput } from "@haruhimemoe/ui";
import { useTranslations } from "next-intl";

/** What the captain typed. Members stay text until submit. */
export type TeamDraft = { name: string; tag: string; members: string };

/** TeamFields' props: the draft and its change handler. */
export type TeamFieldsProps = {
  value: TeamDraft;
  onChange: (value: TeamDraft) => void;
  disabled?: boolean;
};

/**
 * @function parseMembers
 * @param text {string} osu! ids separated by commas or spaces
 * @returns {number[]} the positive whole numbers in it, once each
 */
export const parseMembers = (text: string): number[] => [
  ...new Set(
    text
      .split(/[\s,]+/)
      .filter((part) => /^\d+$/.test(part))
      .map(Number)
      .filter((n) => n > 0),
  ),
];

/**
 * @function TeamFields
 * @param props {TeamFieldsProps} the draft
 * @returns {JSX.Element} the team inputs
 */
export function TeamFields({ value, onChange, disabled }: TeamFieldsProps) {
  const t = useTranslations("tourney.teamFields");
  return (
    <div className="flex flex-col gap-4">
      <TextInput
        id="team-name"
        label={t("teamName")}
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        maxLength={32}
        required
        disabled={disabled}
      />
      <TextInput
        id="team-tag"
        label={t("tag")}
        hint={t("optionalUpTo8")}
        value={value.tag}
        onChange={(e) => onChange({ ...value, tag: e.target.value })}
        maxLength={8}
        disabled={disabled}
      />
      <TextInput
        id="team-members"
        label={t("teammatesOsuIds")}
        hint={t("separateIdsWithCommas")}
        value={value.members}
        onChange={(e) => onChange({ ...value, members: e.target.value })}
        disabled={disabled}
      />
    </div>
  );
}
