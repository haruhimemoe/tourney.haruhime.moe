/**
 * @file src/lib/manage-client.ts
 * @desc The browser half of the manage routes: postJson sends JSON to a same-origin route and
 *       reads either its body or the refusal's message (from the error map when the route sent
 *       a code, else a generic line).
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { errorMessage } from "@/constants/errors";

/** A route's answer: its JSON, or the message to show with the code and the error's other fields. */
export type PostResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; code?: string; error?: Record<string, unknown> };

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
      | (T & { error?: { code?: string; message?: string } & Record<string, unknown> })
      | null;
    if (response.ok && data) return { ok: true, data };
    const code = data?.error?.code;
    return {
      ok: false,
      message: code ? errorMessage(code) : (data?.error?.message ?? errorMessage("")),
      ...(code ? { code } : {}),
      ...(data?.error ? { error: data.error } : {}),
    };
  } catch {
    return { ok: false, message: "Couldn't reach tourney. Check your connection and try again." };
  }
};
