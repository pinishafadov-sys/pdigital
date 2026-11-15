import { Fragment, type ReactNode } from "react";

/**
 * Safe renderer for text written in the admin (articles, content pages, product descriptions).
 * Supports a small, simple syntax - no raw HTML is ever injected (prevents XSS):
 *   ## Heading / ### Sub-heading
 *   - list item
 *   **bold**
 *   [link text](https://... or /path)
 *   blank line = new paragraph
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${keyBase}-b${i++}`}>{m[1]}</strong>);
    else {
      const external = m[3].startsWith("http");
      out.push(
        <a key={`${keyBase}-a${i++}`} href={m[3]} {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}>
          {m[2]}
        </a>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className={className ?? "rich-text"}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (!lines.length) return null;
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={bi}>
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*[-*•]\s+/, ""), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        const first = lines[0];
        if (first.startsWith("### ")) return <h3 key={bi}>{inline(first.slice(4), `${bi}`)}</h3>;
        if (first.startsWith("## ")) return <h2 key={bi}>{inline(first.slice(3), `${bi}`)}</h2>;
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l, `${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/** Plain-text excerpt (for meta descriptions). */
export function plainText(text: string, max = 160) {
  const clean = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
