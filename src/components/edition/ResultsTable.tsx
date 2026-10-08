/**
 * @file src/components/edition/ResultsTable.tsx
 * @desc Final places from the main bracket: placed teams by place, teams still playing after.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import type { Placement } from "@haruhimemoe/tourney";
import { Table, TBody, Td, THead, Th } from "@haruhimemoe/ui";

/** ResultsTable's props: the results and the names of entrant ids. */
export type ResultsTableProps = {
  results: { champion: string | null; placements: Placement[] };
  names: Readonly<Record<string, string>>;
};

/**
 * @function ResultsTable
 * @param props {ResultsTableProps} the results
 * @returns {JSX.Element} the table, or a line saying there are none yet
 */
export function ResultsTable({ results, names }: ResultsTableProps) {
  if (!results.placements.length) return <p className="text-c3">No results yet.</p>;
  const rows = [...results.placements].sort(
    (x, y) => (x.place ?? Number.POSITIVE_INFINITY) - (y.place ?? Number.POSITIVE_INFINITY),
  );
  return (
    <Table caption="Results" hideCaption>
      <THead>
        <tr>
          <Th>Place</Th>
          <Th>Team</Th>
        </tr>
      </THead>
      <TBody>
        {rows.map((p) => (
          <tr key={p.entrantId}>
            <Td className="tabular-nums">{p.place ?? "-"}</Td>
            <Td>{names[p.entrantId] ?? p.entrantId}</Td>
          </tr>
        ))}
      </TBody>
    </Table>
  );
}
