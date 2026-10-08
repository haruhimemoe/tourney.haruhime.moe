/**
 * @file src/app/credits/page.tsx
 * @desc /credits: who tourney is built on: the haruhime libraries and the osu! API.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { PageHeader, Prose } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { PAGE_SEO, SEO_SITE } from "@/constants/seo";
import { SITE } from "@/constants/site";

/** /credits's title, description, canonical URL and link preview. */
export const metadata: Metadata = pageMetadata(SEO_SITE, {
  path: "/credits",
  ...PAGE_SEO["/credits"],
});

const PACKAGES = ["tourney", "pool", "osu", "time", "ui", "brand"] as const;

/**
 * @function CreditsPage
 * @returns {JSX.Element} who the code and data come from
 */
export default function CreditsPage() {
  return (
    <article>
      <PageHeader
        title="Credits"
        lead="tourney is built on other people's work. This is where everything comes from."
      />
      <Prose className="mt-6">
        <h2>Player and match data</h2>
        <p>
          Player ranks, countries and multiplayer match results come from the{" "}
          <a href="https://osu.ppy.sh/docs">osu! API</a>, by ppy. Mappools come from{" "}
          <a href="https://pools.haruhime.moe">pools.haruhime.moe</a>.
        </p>
        <h2>Built with</h2>
        <ul>
          {PACKAGES.map((name) => (
            <li key={name}>
              <a href={`https://github.com/haruhimemoe/${name}`}>@haruhimemoe/{name}</a>
            </li>
          ))}
        </ul>
        <p>{SITE.trademarkNotice}</p>
      </Prose>
    </article>
  );
}
