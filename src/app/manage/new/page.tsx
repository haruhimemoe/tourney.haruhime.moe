/**
 * @file src/app/manage/new/page.tsx
 * @desc /manage/new: a signed-in host makes an edition, in a lineage they already run or a new
 *       one. Visitors go to sign in; never indexed.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { PageHeader, TextLink } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { CreateEditionForm } from "@/components/manage/CreateEditionForm";
import { SEO_SITE } from "@/constants/seo";
import { SITE } from "@/constants/site";
import { requireUser } from "@/lib/auth-session";
import { listMemberLineages } from "@/services/lineages";

/** The page's title; it's never indexed. */
export const metadata: Metadata = pageMetadata(SEO_SITE, {
  path: "/manage/new",
  title: "Host a tournament",
  index: false,
});

/**
 * @function NewEditionPage
 * @returns {Promise<JSX.Element>} the create form
 */
export default async function NewEditionPage() {
  const user = await requireUser("/manage/new");
  const lineages = await listMemberLineages(user.id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Host a tournament"
        lead={
          <>
            One active edition per account. Need more? Ask on the{" "}
            <TextLink href={SITE.discordUrl}>Discord server</TextLink>.
          </>
        }
      />
      <CreateEditionForm
        lineages={lineages.map(({ slug, name }) => ({ slug, name }))}
        year={new Date().getUTCFullYear()}
      />
    </div>
  );
}
