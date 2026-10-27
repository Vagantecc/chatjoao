// Renderiza a formatação nativa do WhatsApp (*negrito*, _itálico_, ~riscado~, ```mono```)
// e transforma URLs em links, sem usar HTML cru.
import { Fragment, type ReactNode } from "react";

const TOKEN_RE = /(```[\s\S]+?```|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|https?:\/\/[^\s<>()]+[^\s<>().,!?;:])/g;

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const tok = m[0];
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const key = `${keyPrefix}-${i++}`;
    if (tok.startsWith("```")) out.push(<code key={key} className="rounded bg-black/5 px-1 font-mono text-[13px]">{tok.slice(3, -3)}</code>);
    else if (tok.startsWith("*")) out.push(<strong key={key}>{inline(tok.slice(1, -1), key)}</strong>);
    else if (tok.startsWith("_")) out.push(<em key={key}>{inline(tok.slice(1, -1), key)}</em>);
    else if (tok.startsWith("~")) out.push(<s key={key}>{tok.slice(1, -1)}</s>);
    else
      out.push(
        <a key={key} href={tok} target="_blank" rel="noopener noreferrer" className="break-all text-wa-link underline-offset-2 hover:underline">
          {tok}
        </a>,
      );
    last = start + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function WaText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {inline(line, `l${i}`)}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}
