/**
 * @file src/constants/legal-site.ts
 * @desc The LegalSite config next-kit's legal blocks render from: what tourney stores, who
 *       processes it (haruhime.moe for sign-in), the cookies it reads, and the contact for legal
 *       questions. Kept in step with content/legal/privacy.mdx and disclaimers.mdx; update both
 *       when either changes. siteName and contactEmail are repeated from @/constants/site rather
 *       than imported: site.ts reads the Legal footer column from CONTENT, which reads this
 *       file, so importing SITE here would cycle back to it.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import type { LegalSite } from "@haruhimemoe/next-kit/legal";

/** tourney's facts for `<LegalContact />`, `<DataWeKeep />`, `<Processors />`, `<YourRights />`, `<DmcaNotice />` and `<NoWarranty />`. */
export const LEGAL_SITE: LegalSite = {
  siteName: "tourney.haruhime.moe",
  operator: "haruhime.moe",
  contactEmail: "haruhime@haruhime.moe",
  effectiveDate: "2026-10-07",
  stores: [
    {
      what: "Your haruhime account's user ID, next to the lineages you own or help run",
      why: "Knowing who may change a tournament (the account itself lives on haruhime.moe)",
    },
    {
      what: "Your registrations: osu! ID, your answers to the host's questions, and a snapshot of your osu! rank and country",
      why: "Letting the host review and approve players, and checking a tournament's rank and country limits",
    },
    {
      what: "Your team, availability and match results in each tournament you play",
      why: "Running the tournament: schedule, bracket and results pages",
    },
    {
      what: "Your tourney profile: time zone and whether you're a verified host",
      why: "Showing times in your zone and setting how many editions you may run",
    },
    {
      what: "Short-lived rate-limit counters, keyed by IP address or account",
      why: "Stopping floods and abuse; deleted automatically within minutes or hours",
    },
  ],
  processors: [
    {
      name: "Vercel",
      purpose: "hosts the site and keeps request logs.",
      link: "https://vercel.com",
    },
    {
      name: "MongoDB Atlas",
      purpose: "stores tournaments and the data listed above.",
      link: "https://www.mongodb.com/atlas",
    },
    {
      name: "haruhime.moe",
      purpose: "runs sign-in and keeps the account and sessions tourney reads to know who you are.",
      link: "https://www.haruhime.moe",
    },
    {
      name: "osu! (ppy Pty Ltd)",
      purpose:
        "confirms sign-in for haruhime.moe and answers the player and multiplayer match lookups tourney makes.",
      link: "https://osu.ppy.sh",
    },
  ],
  cookies: [
    "haruhime.moe's session cookie (on .haruhime.moe) keeps you signed in; tourney only reads it. It's HttpOnly, so page scripts can't read it.",
    "haruhime-signed-in, also set by haruhime.moe, which pages can read. It only says this browser may be signed in; pages ask who you are only when it's there.",
  ],
  hosting: "tourney never hosts beatmap files: mappools are linked from pools.haruhime.moe.",
};
