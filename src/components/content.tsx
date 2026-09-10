import Link from "next/link";
import type { ReactNode } from "react";
export function ArticleContent({
  content,
  links = [],
}: {
  content: string;
  links?: { name: string; href: string }[];
}) {
  const used = new Set<string>();
  function inline(text: string): ReactNode[] {
    const result: ReactNode[] = [];
    let remaining = text;
    while (remaining && used.size < 20) {
      const candidates = links.filter(link => !used.has(link.href) && link.name).map(link => {
        const escaped = link.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu').exec(remaining);
        return { link, index: match?.index ?? -1 };
      }).filter(candidate => candidate.index >= 0).sort((a,b) => a.index-b.index || b.link.name.length-a.link.name.length);
      const candidate = candidates[0];
      if (!candidate) break;
      const {link,index} = candidate;
      result.push(
        remaining.slice(0, index),
        <Link key={link.href} href={link.href}>
          {remaining.slice(index, index + link.name.length)}
        </Link>,
      );
      remaining = remaining.slice(index + link.name.length);
      used.add(link.href);
    }
    result.push(remaining);
    return result;
  }
  return (
    <div className="prose">
      {content
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((block, i) =>
          block.startsWith("## ") ? (
            <h2 key={i}>{block.slice(3)}</h2>
          ) : block.startsWith("### ") ? (
            <h3 key={i}>{block.slice(4)}</h3>
          ) : block.trim().startsWith("- ") ? (
            <ul key={i}>
              {block.split("\n").map((line, j) => (
                <li key={j}>{inline(line.replace(/^-\s*/, ""))}</li>
              ))}
            </ul>
          ) : (
            <p key={i}>{inline(block)}</p>
          ),
        )}
    </div>
  );
}
