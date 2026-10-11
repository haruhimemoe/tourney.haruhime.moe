/**
 * @file src/components/edition/StaffContact.tsx
 * @desc The host's contact, for players with a question: a plain-text Discord handle and/or a
 *       mailto link, shown only for whichever of the two is set. Nothing renders when neither
 *       is.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import type { Contact } from "@/schemas/social";

/** StaffContact's props: the edition's contact. */
export type StaffContactProps = { contact: Contact };

/**
 * @function StaffContact
 * @param props {StaffContactProps} the edition's contact
 * @returns {JSX.Element | null} the "contact staff" line, or nothing when both are unset
 */
export function StaffContact({ contact }: StaffContactProps) {
  const { email, discord } = contact;
  if (!email && !discord) return null;
  return (
    <p className="text-c3 text-sm">
      Questions? Contact staff
      {discord ? (
        <>
          {" "}
          on Discord: <span className="text-c2">{discord}</span>
        </>
      ) : null}
      {discord && email ? " or by " : email ? " by " : null}
      {email ? (
        <>
          email:{" "}
          <a href={`mailto:${email}`} className="text-c1 underline">
            {email}
          </a>
        </>
      ) : null}
      .
    </p>
  );
}
