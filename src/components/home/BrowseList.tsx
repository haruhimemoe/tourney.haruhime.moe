/**
 * @file src/components/home/BrowseList.tsx
 * @desc /browse's list: each open edition with its lineage, mode, side size, rank range and when
 *       registration closes.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

import { LinkCard } from "@haruhimemoe/ui";
import { useTranslations } from "next-intl";
import { LocalTime } from "@/components/edition/LocalTime";
import type { BrowseItem } from "@/services/dashboard";
import { rankLabel, sidesLabel } from "@/utils/side-format";

/** BrowseList's props: the open editions, and the viewer's zone and hour cycle when known. */
export type BrowseListProps = {
  items: readonly BrowseItem[];
  zone?: string | null | undefined;
  hourCycle?: "h12" | "h23" | null | undefined;
};

/**
 * @function BrowseList
 * @param props {BrowseListProps} the open editions and the viewer's display preferences
 * @returns {JSX.Element} the list, or a line saying nothing is open
 */
export function BrowseList({ items, zone, hourCycle }: BrowseListProps) {
  const t = useTranslations("tourney.browseList");
  if (!items.length) return <p className="text-c3">{t("nothingIsOpenFor")}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ edition, lineage }) => (
        <li key={edition.id}>
          <LinkCard href={`/${lineage.slug}/${edition.slug}`} title={edition.name}>
            <span className="flex flex-col gap-1 text-sm">
              <span>
                {lineage.name} · {edition.mode} · {sidesLabel(edition.sides)} ·{" "}
                {rankLabel(edition.eligibility.rank)}
              </span>
              {edition.registration.closesAt ? (
                <span className="text-c3">
                  Closes{" "}
                  <LocalTime at={edition.registration.closesAt} zone={zone} hourCycle={hourCycle} />
                </span>
              ) : null}
            </span>
          </LinkCard>
        </li>
      ))}
    </ul>
  );
}
