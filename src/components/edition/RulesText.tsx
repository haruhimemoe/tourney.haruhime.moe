/**
 * @file src/components/edition/RulesText.tsx
 * @desc A host's rules text through the Markdown subset in utils/markdown (never MDX), rendered
 *       as React elements so every piece of text is escaped. Links are https only and carry
 *       rel="nofollow noopener".
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { Prose } from "@haruhimemoe/ui";
import { type Inline, parseMarkdown } from "@/utils/markdown";

/**
 * @function Pieces
 * @param props {{ content: Inline[] }} one line's pieces
 * @returns {JSX.Element} the pieces as elements
 */
function Pieces({ content }: { content: Inline[] }) {
  return (
    <>
      {content.map((piece, i) => {
        const key = `${i}-${piece.kind}`;
        if (piece.kind === "bold") return <strong key={key}>{piece.text}</strong>;
        if (piece.kind === "italic") return <em key={key}>{piece.text}</em>;
        if (piece.kind === "code") return <code key={key}>{piece.text}</code>;
        if (piece.kind === "link")
          return (
            <a key={key} href={piece.href} rel="nofollow noopener" target="_blank">
              {piece.text}
            </a>
          );
        return <span key={key}>{piece.text}</span>;
      })}
    </>
  );
}

/**
 * @function RulesText
 * @param props {{ source: string }} the rules text
 * @returns {JSX.Element} the rendered rules
 */
export function RulesText({ source }: { source: string }) {
  return (
    <Prose>
      {parseMarkdown(source).map((block, i) => {
        const key = `${i}-${block.kind}`;
        if (block.kind === "heading") {
          const Tag = (["h2", "h3", "h4"] as const)[block.level - 1] ?? "h4";
          return (
            <Tag key={key}>
              <Pieces content={block.content} />
            </Tag>
          );
        }
        if (block.kind === "list")
          return (
            <ul key={key}>
              {block.items.map((item, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: list items have no identity
                <li key={j}>
                  <Pieces content={item} />
                </li>
              ))}
            </ul>
          );
        return (
          <p key={key}>
            {block.lines.map((line, j) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: lines have no identity
              <span key={j}>
                {j > 0 ? <br /> : null}
                <Pieces content={line} />
              </span>
            ))}
          </p>
        );
      })}
    </Prose>
  );
}
