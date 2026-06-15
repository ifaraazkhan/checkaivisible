import Link from "next/link";
import { Fragment } from "react";

/*
  A tiny, dependency-free content model. Posts and glossary entries are authored as
  arrays of typed blocks (no MDX, no CMS, no runtime markdown lib) so everything ships
  static and every AEO signal — heading shape, the lead answer, lists, citations — is
  under our control. Inline supports **bold** and [label](href); internal links use
  next/link, external links get rel="noopener".
*/

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  // a boxed lead answer — the citable ≤60-word sentence AI engines lift verbatim
  | { type: "answer"; text: string };

// --- inline parser: **bold** and [label](href) ---------------------------------
type Token =
  | { t: "text"; v: string }
  | { t: "bold"; v: string }
  | { t: "link"; v: string; href: string };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) tokens.push({ t: "text", v: src.slice(last, m.index) });
    if (m[1] !== undefined) tokens.push({ t: "bold", v: m[1] });
    else tokens.push({ t: "link", v: m[2] ?? "", href: m[3] ?? "#" });
    last = re.lastIndex;
  }
  if (last < src.length) tokens.push({ t: "text", v: src.slice(last) });
  return tokens;
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {tokenize(text).map((tok, i) => {
        if (tok.t === "bold")
          return (
            <strong key={i} className="font-medium text-foreground/90">
              {tok.v}
            </strong>
          );
        if (tok.t === "link") {
          const external = /^https?:\/\//.test(tok.href);
          if (external)
            return (
              <a
                key={i}
                href={tok.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/90 underline underline-offset-4 hover:text-foreground"
              >
                {tok.v}
              </a>
            );
          return (
            <Link
              key={i}
              href={tok.href as never}
              className="text-foreground/90 underline underline-offset-4 hover:text-foreground"
            >
              {tok.v}
            </Link>
          );
        }
        return <Fragment key={i}>{tok.v}</Fragment>;
      })}
    </>
  );
}

export function Prose({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return (
              <h2 key={i} className="font-display mt-12 text-2xl sm:text-3xl">
                <Inline text={b.text} />
              </h2>
            );
          case "p":
            return (
              <p key={i} className="text-base leading-relaxed text-muted-foreground">
                <Inline text={b.text} />
              </p>
            );
          case "answer":
            return (
              <p
                key={i}
                className="rounded-lg border-l-2 border-score bg-score/5 py-3 pl-5 pr-4 text-base leading-relaxed text-foreground/90"
              >
                <Inline text={b.text} />
              </p>
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="border-l-2 border-primary/60 pl-5 text-lg italic leading-relaxed text-foreground/90"
              >
                <Inline text={b.text} />
              </blockquote>
            );
          case "ul":
            return (
              <ul key={i} className="space-y-2 text-base leading-relaxed text-muted-foreground">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                    <span>
                      <Inline text={it} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="space-y-2 text-base leading-relaxed text-muted-foreground">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="font-mono text-sm text-primary">{j + 1}.</span>
                    <span>
                      <Inline text={it} />
                    </span>
                  </li>
                ))}
              </ol>
            );
        }
      })}
    </div>
  );
}
