/**
 * @file src/app/browse/page.tsx
 * @desc osu! tournaments open for registration now, closing soonest first, 20 a page.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { PageHeader, Pagination } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BrowseList } from "@/components/home/BrowseList";
import { PAGE_SEO, SEO_SITE } from "@/constants/seo";
import { getCurrentUser } from "@/lib/auth-session";
import { resolveViewerPrefs } from "@/lib/public-page";
import { openRegistrations } from "@/services/dashboard";

/** The page's title, description and canonical URL. */
export const metadata: Metadata = pageMetadata(SEO_SITE, {
  path: "/browse",
  ...PAGE_SEO["/browse"],
});

/** Per viewer and per request: never prerendered. */
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ page?: string }> };

/**
 * @function BrowsePage
 * @param props {Props} the page number in `?page=`
 * @returns {Promise<JSX.Element>} the open editions
 */
export default async function BrowsePage({ searchParams }: Props) {
  const t = await getTranslations("tourney.pages.browse");
  const requested = Number.parseInt((await searchParams).page ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const [{ items, pages }, user] = await Promise.all([
    openRegistrations(new Date(), page),
    getCurrentUser(),
  ]);
  const { zone, hourCycle } = await resolveViewerPrefs(user?.id ?? null, user?.preferences ?? null);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("openRegistrations")} lead={t("osuTournamentsTakingPlayers")} />
      <BrowseList items={items} zone={zone} hourCycle={hourCycle} />
      {pages > 1 ? (
        <Pagination page={page} pageCount={pages} hrefFor={(n) => `/browse?page=${n}`} />
      ) : null}
    </div>
  );
}
