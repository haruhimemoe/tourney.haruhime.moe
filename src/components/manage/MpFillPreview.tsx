/**
 * @file src/components/manage/MpFillPreview.tsx
 * @desc What an mp fill found: the score it counted and every problem the library listed. An
 *       unknown player or an off-pool map blocks saving until the host ticks that they checked
 *       it (the wrong lobby looks exactly like that); other problems are shown for information.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

"use client";

import type { MatchProblem, MatchProblemCode } from "@haruhimemoe/tourney/mp";
import { Checkbox, Notice } from "@haruhimemoe/ui";

/** Problems that stop Save until the host acknowledges them. */
export const BLOCKING_PROBLEMS: readonly MatchProblemCode[] = ["unknown-player", "off-pool"];

/**
 * @function problemKey
 * @param p {MatchProblem} a problem
 * @returns {string} its key in the acknowledged set
 */
export const problemKey = (p: MatchProblem): string => `${p.gameId} ${p.code} ${p.message}`;

/** MpFillPreview's props: the counted score, the problems and which are acknowledged. */
export type MpFillPreviewProps = {
  score: { a: number; b: number };
  names: { a: string; b: string };
  problems: readonly MatchProblem[];
  acknowledged: ReadonlySet<string>;
  onAcknowledge: (key: string, on: boolean) => void;
};

/**
 * @function MpFillPreview
 * @param props {MpFillPreviewProps} the fill
 * @returns {JSX.Element} the score and the problem list
 */
export function MpFillPreview({
  score,
  names,
  problems,
  acknowledged,
  onAcknowledge,
}: MpFillPreviewProps) {
  return (
    <div className="flex flex-col gap-2">
      <Notice tone="info">
        From the mp: {names.a} {score.a} - {score.b} {names.b}. Check it, then save.
      </Notice>
      {problems.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {problems.map((p) => {
            const key = problemKey(p);
            return (
              <li key={key} className="flex flex-col gap-1 text-sm">
                <span className="text-c1">
                  Game {p.gameId}: {p.message}
                </span>
                {BLOCKING_PROBLEMS.includes(p.code) ? (
                  <Checkbox
                    id={`ack-${key.replace(/\W+/g, "-")}`}
                    label="I checked this, save anyway"
                    checked={acknowledged.has(key)}
                    onChange={(e) => onAcknowledge(key, e.target.checked)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
