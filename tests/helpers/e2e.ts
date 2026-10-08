/**
 * @file tests/helpers/e2e.ts
 * @desc End-to-end helpers: `api` sends a same-origin JSON request to the route handler a URL
 *       resolves to (as Next would), with an optional session cookie, and fails the test on any
 *       answer outside 2xx unless told to expect it. `playOut` saves a result for every match
 *       whose sides are both known until none are left.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { collections } from "@/lib/collections";
import { getDb } from "@/lib/db";

type Handler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;

/** Every route the runs call, by path pattern. */
const ROUTES: [string, () => Promise<Record<string, unknown>>][] = [
  ["/api/manage/lineages", () => import("@/app/api/manage/lineages/route")],
  ["/api/manage/[lineage]/editions", () => import("@/app/api/manage/[lineage]/editions/route")],
  [
    "/api/manage/[lineage]/[edition]/phase",
    () => import("@/app/api/manage/[lineage]/[edition]/phase/route"),
  ],
  [
    "/api/manage/[lineage]/[edition]/settings",
    () => import("@/app/api/manage/[lineage]/[edition]/settings/route"),
  ],
  [
    "/api/manage/[lineage]/[edition]/registrations/review",
    () => import("@/app/api/manage/[lineage]/[edition]/registrations/review/route"),
  ],
  [
    "/api/manage/[lineage]/[edition]/rounds",
    () => import("@/app/api/manage/[lineage]/[edition]/rounds/route"),
  ],
  [
    "/api/manage/[lineage]/[edition]/qualifiers/fill",
    () => import("@/app/api/manage/[lineage]/[edition]/qualifiers/fill/route"),
  ],
  [
    "/api/manage/[lineage]/[edition]/qualifiers/scores",
    () => import("@/app/api/manage/[lineage]/[edition]/qualifiers/scores/route"),
  ],
  [
    "/api/manage/[lineage]/[edition]/seeds",
    () => import("@/app/api/manage/[lineage]/[edition]/seeds/route"),
  ],
  [
    "/api/manage/[lineage]/[edition]/bracket",
    () => import("@/app/api/manage/[lineage]/[edition]/bracket/route"),
  ],
  [
    "/api/manage/[lineage]/[edition]/matches/[code]/result",
    () => import("@/app/api/manage/[lineage]/[edition]/matches/[code]/result/route"),
  ],
  [
    "/api/editions/[lineage]/[edition]/registration",
    () => import("@/app/api/editions/[lineage]/[edition]/registration/route"),
  ],
];

let calls = 0;

const matcher = (pattern: string) =>
  new RegExp(`^${pattern.replace(/\[(\w+)\]/g, "(?<$1>[^/]+)")}$`);

/**
 * @function api
 * @param method {string} the HTTP method
 * @param url {string} the path, like "/api/manage/egc/egc2026/phase"
 * @param body {unknown} the JSON body (none for DELETE)
 * @param cookie {string | null} a session cookie
 * @param expect {number} the status to expect (default any 2xx)
 * @returns {Promise<any>} the parsed JSON answer
 */
export const api = async (
  method: string,
  url: string,
  body: unknown,
  cookie: string | null,
  expect?: number,
  // biome-ignore lint/suspicious/noExplicitAny: test helper; callers read what they need
): Promise<any> => {
  for (const [pattern, load] of ROUTES) {
    const found = matcher(pattern).exec(url);
    if (!found) continue;
    const handler = (await load())[method] as Handler | undefined;
    if (!handler) throw new Error(`${pattern} has no ${method}`);
    const response = await handler(
      new Request(`https://tourney.haruhime.moe${url}`, {
        method,
        headers: {
          "content-type": "application/json",
          origin: "https://tourney.haruhime.moe",
          "sec-fetch-site": "same-origin",
          "x-forwarded-for": `198.51.${Math.floor(++calls / 250)}.${calls % 250}`,
          ...(cookie ? { cookie } : {}),
        },
        body: method === "DELETE" ? null : JSON.stringify(body),
      }),
      { params: Promise.resolve({ ...(found.groups ?? {}) }) },
    );
    const text = await response.text();
    const ok = expect === undefined ? response.ok : response.status === expect;
    if (!ok) throw new Error(`${method} ${url} answered ${response.status}: ${text}`);
    return text ? JSON.parse(text) : null;
  }
  throw new Error(`No route for ${url}`);
};

/**
 * @function playOut
 * @param base {string} the edition's manage path, like "/api/manage/egc/egc2026"
 * @param editionId {string} the edition
 * @param cookie {string} a host's cookie
 * @param winner {(round: string) => "a" | "b"} which side wins a match in this round
 * @returns {Promise<number>} how many results were saved
 */
export const playOut = async (
  base: string,
  editionId: string,
  cookie: string,
  winner: (round: string) => "a" | "b" = () => "a",
): Promise<number> => {
  let saved = 0;
  for (;;) {
    const open = await collections(getDb())
      .matches.find({ editionId, status: "scheduled", a: { $ne: null }, b: { $ne: null } })
      .sort({ bracketCode: 1 })
      .toArray();
    const next = open[0];
    if (!next) return saved;
    const win = (next.bestOf + 1) / 2;
    const side = winner(next.round);
    await api(
      "PUT",
      `${base}/matches/${next.bracketCode}/result`,
      {
        score: side === "a" ? { a: win, b: 0 } : { a: 0, b: win },
        maps: [],
        pickBans: [],
        mpLinks: [],
        streamUrl: null,
        vodUrl: null,
      },
      cookie,
    );
    saved++;
  }
};
