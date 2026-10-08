/**
 * @file src/constants/content.ts
 * @desc The content registry: every docs and legal page (content/<section>/<slug>.mdx), its
 *       title, description and last update. Pages, .md mirrors, nav and sitemap read it. tourney
 *       has no guides. The legal section's five entries come from next-kit's legalEntries, with
 *       tourney's own titles, descriptions and dates kept as overrides. Bump an entry's
 *       lastUpdated in the same commit as its text.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { defineContent } from "@haruhimemoe/next-kit/docs";
import { legalEntries } from "@haruhimemoe/next-kit/legal";
import { LEGAL_SITE } from "@/constants/legal-site";

/** Every docs and legal page, validated by next-kit's defineContent. */
export const CONTENT = defineContent({
  docs: [
    {
      slug: "hosting",
      title: "Hosting a tournament",
      description:
        "How to host an osu! tournament on tourney.haruhime.moe: sign in, make a lineage and its first edition, then work through the setup checklist to open registration.",
      lastUpdated: "2026-10-08",
    },
    {
      slug: "playing",
      title: "Playing in a tournament",
      description:
        "How to play in an osu! tournament on tourney.haruhime.moe: register, set when you're free, and find your team, your next match and its pool.",
      lastUpdated: "2026-10-08",
    },
    {
      slug: "results",
      title: "Entering results",
      description:
        "How hosts enter match results on tourney.haruhime.moe: typing a score, reading an osu! mp link, the problems a fill can find, forfeits and undo.",
      lastUpdated: "2026-10-08",
    },
  ],
  legal: legalEntries(LEGAL_SITE, {
    disclaimers: {
      title: "Disclaimers",
      description:
        "Who tourney isn't affiliated with, whose rules a tournament follows, where ranks come from, and how tourney's requests to osu! and pools identify themselves.",
      lastUpdated: "2026-10-07",
    },
    privacy: {
      title: "Privacy",
      description:
        "What tourney.haruhime.moe stores when you visit, sign in with osu!, host or register for a tournament, why, and for how long. No analytics, no cookies unless you sign in.",
      lastUpdated: "2026-10-08",
    },
    terms: {
      title: "Terms",
      description:
        "The rules for signing in with osu!, hosting and registering on tourney.haruhime.moe: what hosts are responsible for, what gets moderated, and deleting your data.",
      lastUpdated: "2026-10-07",
    },
    "your-privacy-rights": {
      title: "GDPR & CCPA",
      description:
        "Your rights over your data under the GDPR and the CCPA, what tourney stores and why, and how to use these rights through your haruhime account.",
      lastUpdated: "2026-10-07",
    },
    copyright: {
      title: "Copyright & Takedown",
      description:
        "tourney never hosts beatmap files. How to report a copyright concern about a tournament page, and where to send a DMCA notice to haruhime.moe.",
      lastUpdated: "2026-10-07",
    },
  }),
});
