/**
 * @file src/lib/manage-client.ts
 * @desc The browser half of the manage routes: postJson sends JSON to a same-origin route and
 *       reads either its body or the refusal's message (from the error map when the route sent
 *       a code, else a generic line). A 400 from parseStrictBody also carries `issues` (every
 *       zod issue, path included) at the body's top level, alongside `error`; postJson passes
 *       both through so a form can point at the field by path.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

import { errorMessage } from "@/constants/errors";

/** One zod issue as parseStrictBody sends it: its path (field names and array indexes) and message. */
export type FieldIssue = { path: (string | number)[]; message: string };

/** A route's answer: its JSON, or the message to show with the code, the error's other fields,
 *  and (a parseStrictBody 400) the issues to point a form at the field by path. */
export type PostResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      message: string;
      code?: string;
      error?: Record<string, unknown>;
      issues?: FieldIssue[];
    };

/**
 * @function postJson
 * @param url {string} a same-origin route
 * @param body {unknown} the JSON body
 * @param method {string} POST unless given
 * @returns {Promise<PostResult<T>>} the answer, never a throw
 */
export const postJson = async <T>(
  url: string,
  body: unknown,
  method = "POST",
): Promise<PostResult<T>> => {
  try {
    const response = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as
      | (T & {
          error?: { code?: string; message?: string } & Record<string, unknown>;
          issues?: FieldIssue[];
        })
      | null;
    if (response.ok && data) return { ok: true, data };
    const code = data?.error?.code;
    return {
      ok: false,
      message: code ? errorMessage(code) : (data?.error?.message ?? errorMessage("")),
      ...(code ? { code } : {}),
      ...(data?.error ? { error: data.error } : {}),
      ...(data?.issues ? { issues: data.issues } : {}),
    };
  } catch {
    return { ok: false, message: "Couldn't reach tourney. Check your connection and try again." };
  }
};
