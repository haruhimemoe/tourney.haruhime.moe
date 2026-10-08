/**
 * @file src/components/home/HostingTab.tsx
 * @desc The lineages the account runs, each edition with what needs a host: registrations to
 *       review, matches without a time, results overdue. Nothing to do shows "All caught up".
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { Card, TextLink } from "@haruhimemoe/ui";
import type { HostingEntry, HostTodo } from "@/services/dashboard";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * @function todoLines
 * @param todo {HostTodo} the counts
 * @returns {string[]} one line per non-zero count
 */
const todoLines = (todo: HostTodo): string[] => [
  ...(todo.pendingRegistrations
    ? [plural(todo.pendingRegistrations, "registration to review", "registrations to review")]
    : []),
  ...(todo.untimedMatches
    ? [plural(todo.untimedMatches, "match without a time", "matches without a time")]
    : []),
  ...(todo.missingResults
    ? [plural(todo.missingResults, "result overdue", "results overdue")]
    : []),
];

/**
 * @function HostingTab
 * @param props {{ entries: readonly HostingEntry[] }} the lineages
 * @returns {JSX.Element} one card per lineage
 */
export function HostingTab({ entries }: { entries: readonly HostingEntry[] }) {
  return (
    <div className="flex flex-col gap-4">
      {entries.map(({ lineage, editions }) => (
        <Card
          key={lineage.id}
          title={<TextLink href={`/${lineage.slug}`}>{lineage.name}</TextLink>}
        >
          {editions.length ? (
            <ul className="flex flex-col gap-3 text-sm">
              {editions.map(({ edition, todo }) => {
                const lines = todoLines(todo);
                return (
                  <li key={edition.id} className="flex flex-col gap-1">
                    <TextLink href={`/manage/${lineage.slug}/${edition.slug}`}>
                      {edition.name}
                    </TextLink>
                    {lines.length ? (
                      <ul className="text-c2">
                        {lines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-c3">All caught up</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-c3 text-sm">No editions yet.</p>
          )}
        </Card>
      ))}
    </div>
  );
}
