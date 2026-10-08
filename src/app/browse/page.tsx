/**
 * @file src/app/browse/page.tsx
 * @desc osu! tournaments open for registration now, closing soonest first, 20 a page.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { PageHeader, Pagination } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { BrowseList } from "@/components/home/BrowseList";
import { PAGE_SEO, SEO_SITE } from "@/constants/seo";
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
  const requested = Number.parseInt((await searchParams).page ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const { items, pages } = await openRegistrations(new Date(), page);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Open registrations" lead="osu! tournaments taking players now." />
      <BrowseList items={items} />
      {pages > 1 ? (
        <Pagination page={page} pageCount={pages} hrefFor={(n) => `/browse?page=${n}`} />
      ) : null}
    </div>
  );
}
