/**
 * @file src/utils/markdown.ts
 * @desc The Markdown subset host rules text is read with. Never MDX: that would run host code.
 *       Paragraphs (single newlines are line breaks), `#` to `###` headings, `-` lists, and
 *       inline `**bold**`, `*italic*`, `` `code` `` and `[text](https://...)` links. Anything
 *       else, HTML included, is text. The result is a tree React renders, so text is escaped.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

/** One inline piece. Links are https only. */
export type Inline =
  | { kind: "text" | "bold" | "italic" | "code"; text: string }
  | { kind: "link"; text: string; href: string };

/** One block. */
export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; content: Inline[] }
  | { kind: "list"; items: Inline[][] }
  | { kind: "paragraph"; lines: Inline[][] };

const INLINE = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g;

/**
 * @function parseInline
 * @param line {string} one line of text
 * @returns {Inline[]} its pieces; adjacent plain text merged
 */
export const parseInline = (line: string): Inline[] => {
  const out: Inline[] = [];
  const text = (t: string) => {
    if (!t) return;
    const last = out.at(-1);
    if (last?.kind === "text") last.text += t;
    else out.push({ kind: "text", text: t });
  };
  let at = 0;
  for (const m of line.matchAll(INLINE)) {
    text(line.slice(at, m.index));
    const [, bold, italic, code, label, href] = m;
    if (bold !== undefined) out.push({ kind: "bold", text: bold });
    else if (italic !== undefined) out.push({ kind: "italic", text: italic });
    else if (code !== undefined) out.push({ kind: "code", text: code });
    else out.push({ kind: "link", text: label as string, href: href as string });
    at = m.index + m[0].length;
  }
  text(line.slice(at));
  return out;
};

const HEADING = /^(#{1,3}) (.+)$/;
const ITEM = /^- (.+)$/;

/**
 * @function parseMarkdown
 * @param source {string} the rules text
 * @returns {Block[]} its blocks in order
 */
export const parseMarkdown = (source: string): Block[] => {
  const blocks: Block[] = [];
  let para: Inline[][] | null = null;
  let list: Inline[][] | null = null;
  const close = () => {
    para = null;
    list = null;
  };
  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      close();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      close();
      const level = (heading[1] as string).length as 1 | 2 | 3;
      blocks.push({ kind: "heading", level, content: parseInline(heading[2] as string) });
      continue;
    }
    const item = ITEM.exec(line);
    if (item) {
      para = null;
      if (!list) {
        list = [];
        blocks.push({ kind: "list", items: list });
      }
      list.push(parseInline(item[1] as string));
      continue;
    }
    list = null;
    if (!para) {
      para = [];
      blocks.push({ kind: "paragraph", lines: para });
    }
    para.push(parseInline(line));
  }
  return blocks;
};
