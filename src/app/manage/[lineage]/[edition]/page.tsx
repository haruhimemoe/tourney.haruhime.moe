/**
 * @file src/app/manage/[lineage]/[edition]/page.tsx
 * @desc /manage/[lineage]/[edition]: the edition's manage home for its owner and admins: the
 *       phase, the setup checklist and the button to the next phase. Anyone else gets a 404.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { PageHeader, TextLink } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PhaseButton } from "@/components/manage/PhaseButton";
import { SetupChecklist } from "@/components/manage/SetupChecklist";
import { PHASE_LABELS } from "@/constants/manage";
import { SEO_SITE } from "@/constants/seo";
import { requireUser } from "@/lib/auth-session";
import { getEdition } from "@/services/editions";
import { memberRole } from "@/services/lineages";
import { listRounds } from "@/services/rounds";
import { nextPhase, setupChecklist } from "@/utils/setup-checklist";

type Props = { params: Promise<{ lineage: string; edition: string }> };

/**
 * @function generateMetadata
 * @param props {Props} the slugs
 * @returns {Promise<Metadata>} a never-indexed title
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lineage, edition } = await params;
  return pageMetadata(SEO_SITE, {
    path: `/manage/${lineage}/${edition}`,
    title: "Manage edition",
    index: false,
  });
}

/**
 * @function ManageEditionPage
 * @param props {Props} the slugs
 * @returns {Promise<JSX.Element>} the edition's manage home
 */
export default async function ManageEditionPage({ params }: Props) {
  const { lineage: lineageSlug, edition: editionSlug } = await params;
  const user = await requireUser(`/manage/${lineageSlug}/${editionSlug}`);
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found || !memberRole(found.lineage, user.id)) notFound();
  const { lineage, edition } = found;
  const next = nextPhase(edition);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={edition.name}
        lead={lineage.name}
        meta={`Phase: ${PHASE_LABELS[edition.phase]}`}
        actions={
          next ? <PhaseButton lineage={lineage.slug} edition={edition.slug} to={next} /> : null
        }
      />
      <nav aria-label="Edition pages" className="flex gap-4 text-sm">
        <TextLink href={`/manage/${lineage.slug}/${edition.slug}/registrations`}>
          Registrations
        </TextLink>
        <TextLink href={`/manage/${lineage.slug}/${edition.slug}/settings/registration`}>
          Registration settings
        </TextLink>
        <TextLink href={`/manage/${lineage.slug}/${edition.slug}/rounds`}>
          Bracket and rounds
        </TextLink>
      </nav>
      <SetupChecklist items={setupChecklist(edition, await listRounds(edition.id))} />
    </div>
  );
}
