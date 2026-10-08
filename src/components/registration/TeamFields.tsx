/**
 * @file src/components/registration/TeamFields.tsx
 * @desc A captain's team: name, tag, and teammates' osu! ids. No invites in v0: teammates are
 *       listed, and the host's approval is the check.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

"use client";

import { TextInput } from "@haruhimemoe/ui";

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
  return (
    <div className="flex flex-col gap-4">
      <TextInput
        id="team-name"
        label="Team name"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        maxLength={32}
        required
        disabled={disabled}
      />
      <TextInput
        id="team-tag"
        label="Tag"
        hint="Optional, up to 8 characters."
        value={value.tag}
        onChange={(e) => onChange({ ...value, tag: e.target.value })}
        maxLength={8}
        disabled={disabled}
      />
      <TextInput
        id="team-members"
        label="Teammates (osu! ids)"
        hint="Separate ids with commas. You're the captain and don't need to list yourself."
        value={value.members}
        onChange={(e) => onChange({ ...value, members: e.target.value })}
        disabled={disabled}
      />
    </div>
  );
}
