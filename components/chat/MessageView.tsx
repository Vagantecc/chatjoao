"use client";

import type { InMessage, OutMessage, ReplyButton } from "@/lib/messages";
import { WaText } from "@/lib/wa-format";

export type ChatItem =
  | { id: string; from: "joao"; at: number; msg: OutMessage }
  | { id: string; from: "user"; at: number; msg: InMessage; read: boolean };

const time = (at: number) => new Date(at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Meta({ at, read, mine }: { at: number; read?: boolean; mine?: boolean }) {
  return (
    <span className="float-right ml-2 mt-1.5 flex translate-y-1 items-center gap-0.5 whitespace-nowrap text-[11px] leading-none text-wa-meta">
      {time(at)}
      {mine && <Ticks read={!!read} />}
    </span>
  );
}

function Ticks({ read }: { read: boolean }) {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" aria-label={read ? "lida" : "entregue"} className={read ? "text-wa-tick" : "text-wa-meta"}>
      <path fill="currentColor" d="M11.07.65 10.4.12a.4.4 0 0 0-.56.07L5.4 5.9 3.53 4.12a.4.4 0 0 0-.56 0l-.6.6a.4.4 0 0 0 0 .56l2.7 2.6a.4.4 0 0 0 .6-.04l5.47-6.62a.4.4 0 0 0-.07-.57Z" />
      <path fill="currentColor" d="M15.07.65 14.4.12a.4.4 0 0 0-.56.07L9.4 5.9l-.73-.7-.86 1.04 1.25 1.2a.4.4 0 0 0 .6-.04l5.47-6.62a.4.4 0 0 0-.07-.57Z" />
    </svg>
  );
}

function Bubble({ mine, children, tail = true, flush = false }: { mine: boolean; children: React.ReactNode; tail?: boolean; flush?: boolean }) {
  return (
    <div
      className={[
        "relative max-w-[88%] animate-pop rounded-lg text-[14.2px] leading-[19px] text-wa-text shadow-[0_1px_0.5px_rgba(11,20,26,.13)] sm:max-w-[75%]",
        mine ? "self-end bg-wa-out" : "self-start bg-wa-in",
        tail ? (mine ? "bubble-tail-out rounded-tr-none" : "bubble-tail-in rounded-tl-none") : "",
        flush ? "overflow-hidden" : "px-2 pb-2 pt-1.5",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function ActionRow({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const cls =
    "flex w-full items-center justify-center gap-1.5 border-t border-black/[.08] px-3 py-2.5 text-[14px] font-medium text-wa-link transition hover:bg-black/[.03] active:bg-black/[.06]";
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

const ExternalIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);
const ReplyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden fill="currentColor">
    <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11Z" />
  </svg>
);
const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="currentColor">
    <path d="M3 5h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7z" />
  </svg>
);

/** Tile do OpenStreetMap que contém o ponto (zoom 15), para a prévia do mapa. */
function osmTile(lat: number, lng: number, z = 15) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

function MapPreview({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="relative h-36 w-full overflow-hidden bg-[#e8e2d6]">
      <img src={osmTile(lat, lng)} alt="" className="h-full w-full object-cover" loading="lazy" />
      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full drop-shadow" width="28" height="36" viewBox="0 0 24 32" aria-hidden>
        <path fill="#EA4335" d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 32 12 32s12-11.6 12-20.3C24 5.2 18.6 0 12 0Z" />
        <circle cx="12" cy="11.5" r="4.5" fill="#fff" />
      </svg>
      <span className="absolute bottom-0.5 right-1 text-[9px] text-black/60">© OpenStreetMap</span>
    </div>
  );
}

export function MessageView({
  item,
  showTail,
  onReply,
  onOpenList,
}: {
  item: ChatItem;
  showTail: boolean;
  onReply: (b: ReplyButton) => void;
  onOpenList: (msg: Extract<OutMessage, { type: "list" }>) => void;
}) {
  if (item.from === "user") {
    const m = item.msg;
    if (m.type === "location") {
      return (
        <Bubble mine tail={showTail} flush>
          <a href={`https://www.google.com/maps?q=${m.lat},${m.lng}`} target="_blank" rel="noopener noreferrer" className="block w-64">
            <MapPreview lat={m.lat} lng={m.lng} />
          </a>
          <div className="px-2 pb-1.5 pt-1 text-[13px]">
            {m.name ?? "Localização"}
            <Meta at={item.at} read={item.read} mine />
          </div>
        </Bubble>
      );
    }
    return (
      <Bubble mine tail={showTail}>
        <span className="whitespace-pre-wrap break-words">{m.type === "text" ? m.text : m.title}</span>
        <Meta at={item.at} read={item.read} mine />
      </Bubble>
    );
  }

  const m = item.msg;
  switch (m.type) {
    case "text":
      return (
        <Bubble mine={false} tail={showTail}>
          <span className="break-words">
            <WaText text={m.text} />
          </span>
          <Meta at={item.at} />
        </Bubble>
      );
    case "buttons":
      return (
        <Bubble mine={false} tail={showTail} flush>
          <div className="px-2 pb-2 pt-1.5">
            <WaText text={m.text} />
            <Meta at={item.at} />
          </div>
          {m.buttons.map((b) => (
            <ActionRow key={b.id} onClick={() => onReply(b)}>
              <ReplyIcon />
              {b.title}
            </ActionRow>
          ))}
        </Bubble>
      );
    case "list":
      return (
        <Bubble mine={false} tail={showTail} flush>
          <div className="px-2 pb-2 pt-1.5">
            <WaText text={m.text} />
            <Meta at={item.at} />
          </div>
          <ActionRow onClick={() => onOpenList(m)}>
            <ListIcon />
            {m.button}
          </ActionRow>
        </Bubble>
      );
    case "product": {
      const p = m.product;
      return (
        <Bubble mine={false} tail={showTail} flush>
          <div className="w-64 sm:w-72">
            {p.imageUrl ? (
              <img src={p.imageUrl} alt="" className="h-44 w-full bg-white object-contain p-2" loading="lazy" />
            ) : (
              <div className="grid h-24 place-items-center bg-[#f3ede6] text-3xl" aria-hidden>
                🧱
              </div>
            )}
            <div className="px-2 pb-2 pt-1.5">
              {p.badge && <span className="mb-1 inline-block rounded bg-tumelero-laranja px-1.5 py-0.5 text-[11px] font-bold text-tumelero-marinho">{p.badge}</span>}
              <p className="font-semibold leading-snug">{p.name}</p>
              <p className="mt-1">
                {p.listPrice && p.listPrice > p.price && <s className="mr-1.5 text-[13px] text-wa-meta">{brl(p.listPrice)}</s>}
                <strong className="text-[15px]">{brl(p.price)}</strong>
              </p>
              <p className="text-[12.5px] text-wa-meta">tumelero.com.br</p>
              <Meta at={item.at} />
            </div>
            <ActionRow href={p.link}>
              <ExternalIcon />
              Ver no site
            </ActionRow>
          </div>
        </Bubble>
      );
    }
    case "location":
      return (
        <Bubble mine={false} tail={showTail} flush>
          <a href={`https://www.google.com/maps?q=${m.lat},${m.lng}`} target="_blank" rel="noopener noreferrer" className="block w-64 sm:w-72">
            <MapPreview lat={m.lat} lng={m.lng} />
            <div className="px-2 pb-2 pt-1.5">
              <p className="font-semibold text-wa-link">{m.name}</p>
              <p className="text-[13px] text-wa-meta">{m.address}</p>
              <Meta at={item.at} />
            </div>
          </a>
        </Bubble>
      );
    case "cta":
      return (
        <Bubble mine={false} tail={showTail} flush>
          <div className="px-2 pb-2 pt-1.5">
            <WaText text={m.text} />
            <Meta at={item.at} />
          </div>
          <ActionRow href={m.url}>
            <ExternalIcon />
            {m.label}
          </ActionRow>
        </Bubble>
      );
    case "document":
      return (
        <Bubble mine={false} tail={showTail}>
          <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex w-64 items-center gap-3 rounded-md bg-black/[.04] p-2.5 hover:bg-black/[.07]">
            <span className="grid h-10 w-8 shrink-0 place-items-center rounded-sm bg-[#E5534B] text-[9px] font-bold text-white">PDF</span>
            <span className="min-w-0">
              <span className="block truncate text-[14px]">{m.filename}</span>
              <span className="text-[12px] text-wa-meta">PDF · toque para abrir</span>
            </span>
          </a>
          {m.caption && <p className="mt-1.5">{m.caption}</p>}
          <Meta at={item.at} />
        </Bubble>
      );
  }
}
