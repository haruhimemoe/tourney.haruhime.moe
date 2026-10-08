/**
 * @file src/components/layout/Footer.tsx
 * @desc Site footer: the tourney / About / Legal link columns with ui's "haruhime tools"
 *       column after tourney, the affiliation notice as fine print, and the row linking the
 *       parent brand, the Discord server and the haruhimemoe GitHub org.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { SiteFooter } from "@haruhimemoe/ui";
import { FOOTER_COLUMNS, SITE } from "@/constants/site";

/**
 * @function Footer
 * @returns {JSX.Element} ui's SiteFooter with the columns, the Discord and GitHub links and the
 *          trademark notice
 */
export function Footer() {
  return (
    <SiteFooter
      columns={FOOTER_COLUMNS}
      tools={{ position: 1 }}
      finePrint={SITE.trademarkNotice}
      parentHref={SITE.parentUrl}
      githubHref={SITE.githubOrg}
      discordHref={SITE.discordUrl}
    />
  );
}
