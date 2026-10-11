/**
 * @file src/components/edition/SocialLinks.tsx
 * @desc An edition's public social links: an icon (Discord only; ui's icon set has no icon for
 *       the other kinds, so they fall back to a text label alone) plus the kind's label, or a
 *       custom link's own label. Every link opens in the current tab's origin context only
 *       (rel="noopener noreferrer") and gets a 44px touch target on a coarse pointer. Nothing
 *       renders when there are no socials.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { DiscordIcon } from "@haruhimemoe/ui";
import type { Social } from "@/schemas/social";

/** SocialLinks' props: the edition's socials, in display order. */
export type SocialLinksProps = { socials: readonly Social[] };

/** Each kind's label, shown unless the link is "custom" (its own label wins). */
const KIND_LABELS: Record<Social["kind"], string> = {
  discord: "Discord",
  twitter: "Twitter",
  twitch: "Twitch",
  youtube: "YouTube",
  website: "Website",
  challonge: "Challonge",
  sheets: "Sheets",
  forum: "osu! forum",
  custom: "Link",
};

/**
 * @function SocialLinks
 * @param props {SocialLinksProps} the edition's socials
 * @returns {JSX.Element | null} a list of links, or nothing when there are none
 */
export function SocialLinks({ socials }: SocialLinksProps) {
  if (socials.length === 0) return null;
  return (
    <ul className="flex flex-wrap coarse:gap-6 gap-4">
      {socials.map((social) => (
        <li key={`${social.kind}-${social.url}`}>
          <a
            href={social.url}
            rel="noopener noreferrer"
            target="_blank"
            className="coarse:-m-3 inline-flex items-center gap-1.5 coarse:p-3 text-c2 hover:text-c1"
          >
            {social.kind === "discord" ? <DiscordIcon /> : null}
            {social.label ?? KIND_LABELS[social.kind]}
          </a>
        </li>
      ))}
    </ul>
  );
}
