"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BrainResult, InMessage, OutMessage, ReplyButton, ToolTrace } from "@/lib/messages";
import { PRESET_LOCATIONS, SCENARIOS, TEST_DATA } from "@/lib/scenarios";
import { MessageView, type ChatItem } from "./chat/MessageView";

interface TurnLog {
  id: string;
  label: string;
  trace: ToolTrace[];
  intent: string | null;
  escalated: boolean;
  ms: number;
  error?: string;
}

const PHONE_KEY = "joao-sim-phone";
const REVEAL_DELAY_MS = 650;

function newPhone() {
  return `sim:${crypto.randomUUID()}`;
}

function getPhone(): string {
  try {
    const saved = localStorage.getItem(PHONE_KEY);
    if (saved) return saved;
    const p = newPhone();
    localStorage.setItem(PHONE_KEY, p);
    return p;
  } catch {
    return newPhone();
  }
}

const uid = () => Math.random().toString(36).slice(2);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Simulator({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [demo, setDemo] = useState(true);
  const [demoOpenMobile, setDemoOpenMobile] = useState(false);
  const [logs, setLogs] = useState<TurnLog[]>([]);
  const [list, setList] = useState<Extract<OutMessage, { type: "list" }> | null>(null);
  const [locOpen, setLocOpen] = useState(false);
  const phoneRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  // Fila: o cliente pode mandar várias mensagens seguidas, como no WhatsApp; o João responde uma por vez.
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [items, typing]);

  const call = useCallback((message: InMessage, label: string, showUser: boolean) => {
    const userItemId = uid();
    if (showUser) setItems((xs) => [...xs, { id: userItemId, from: "user", at: Date.now(), msg: message, read: false }]);
    queueRef.current = queueRef.current.then(() => processTurn(message, label, userItemId));
    return queueRef.current;
  }, []);

  const processTurn = async (message: InMessage, label: string, userItemId: string) => {
    setBusy(true);
    await sleep(350);
    setItems((xs) => xs.map((x) => (x.id === userItemId && x.from === "user" ? { ...x, read: true } : x)));
    setTyping(true);
    const started = performance.now();
    let result: BrainResult | null = null;
    let error: string | undefined;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneRef.current, message }),
      });
      result = (await res.json()) as BrainResult;
      if (!res.ok && !result?.messages) error = `HTTP ${res.status}`;
    } catch (e) {
      error = (e as Error).message;
    }
    const ms = Math.round(performance.now() - started);
    const messages: OutMessage[] = result?.messages ?? [{ type: "text", text: "Ops, perdi a conexão. 🧱 Tenta de novo?" }];
    setLogs((ls) => [{ id: uid(), label, trace: result?.trace ?? [], intent: result?.intent ?? null, escalated: !!result?.escalated, ms, error }, ...ls]);

    for (let i = 0; i < messages.length; i++) {
      if (i > 0) {
        setTyping(true);
        await sleep(REVEAL_DELAY_MS);
      }
      setTyping(false);
      setItems((xs) => [...xs, { id: uid(), from: "joao", at: Date.now(), msg: messages[i] }]);
    }
    setTyping(false);
    setBusy(false);
  };

  // Abre a conversa com as boas-vindas.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    phoneRef.current = getPhone();
    void call({ type: "text", text: "__start__" }, "início da conversa", false);
  }, [call]);

  const sendText = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setInput("");
    void call({ type: "text", text: t }, t, true);
  };

  const sendReply = (b: ReplyButton) => {
    void call({ type: "reply", id: b.id, title: b.title }, `[botão] ${b.title}`, true);
  };

  const sendLocation = (lat: number, lng: number, name?: string) => {
    setLocOpen(false);
    void call({ type: "location", lat, lng, name }, `[localização] ${name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`}`, true);
  };

  const restart = async () => {
    if (busy) return;
    await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phoneRef.current, reset: true }) });
    const p = newPhone();
    try {
      localStorage.setItem(PHONE_KEY, p);
    } catch {}
    phoneRef.current = p;
    setItems([]);
    setLogs([]);
    void call({ type: "text", text: "__start__" }, "nova conversa", false);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#d1d7db] lg:p-4">
      <div className="mx-auto flex h-full w-full max-w-[1400px] overflow-hidden bg-white lg:rounded-xl lg:shadow-2xl">
        {/* ------- Chat ------- */}
        <section className="wa-font relative flex min-w-0 flex-1 flex-col" aria-label="Conversa com o João da Obra">
          <header className="flex h-[60px] shrink-0 items-center gap-3 bg-wa-headerDark px-2 text-white sm:px-4">
            <button type="button" onClick={onBack} aria-label="Voltar para a apresentação" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 4 13.4 5.4 7.8 11H20v2H7.8l5.6 5.6L12 20l-8-8z" />
              </svg>
            </button>
            <Image src="/joao-avatar.png" alt="" width={40} height={40} className="h-10 w-10 rounded-full bg-tumelero-barro" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="flex items-center gap-1 truncate text-[16px] font-medium">
                João da Obra · Tumelero
                <svg width="16" height="16" viewBox="0 0 24 24" aria-label="conta comercial verificada">
                  <path fill="#25D366" d="m12 1 2.6 2.1 3.3-.3.9 3.2 2.9 1.6-1.2 3.1 1.2 3.1-2.9 1.6-.9 3.2-3.3-.3L12 23l-2.6-2.1-3.3.3-.9-3.2-2.9-1.6L3.5 13 2.3 9.9l2.9-1.6.9-3.2 3.3.3z" />
                  <path fill="#fff" d="m10.6 15.6-3.2-3.2 1.4-1.4 1.8 1.8 4.6-4.6 1.4 1.4z" />
                </svg>
              </p>
              <p className="text-[13px] text-white/80" aria-live="polite">
                {typing ? "digitando…" : "online"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => (window.matchMedia("(min-width: 1024px)").matches ? setDemo((d) => !d) : setDemoOpenMobile(true))}
              className="rounded-full border border-white/40 px-3 py-1 text-[13px] font-semibold hover:bg-white/10"
              aria-pressed={demo}
            >
              Modo demo
            </button>
            <button type="button" onClick={restart} title="Nova conversa" aria-label="Começar nova conversa" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
              </svg>
            </button>
          </header>

          <div ref={scrollRef} className="wa-wallpaper scrollbar-thin flex-1 overflow-y-auto px-3 py-4 sm:px-[6%]" role="log" aria-live="polite">
            <div className="mx-auto mb-3 w-fit rounded-lg bg-[#ffeecd] px-3 py-1.5 text-center text-[12.5px] text-[#54656f] shadow-sm">
              🔒 Simulador do WhatsApp. Pedidos, cartão e cupons são fictícios.
            </div>
            <div className="flex flex-col gap-[3px]">
              {items.map((it, i) => {
                const prev = items[i - 1];
                const showTail = !prev || prev.from !== it.from;
                return (
                  <div key={it.id} className={`flex flex-col ${showTail && i > 0 ? "mt-2" : ""}`}>
                    <MessageView item={it} showTail={showTail} onReply={sendReply} onOpenList={setList} />
                  </div>
                );
              })}
              {typing && (
                <div className="mt-2 flex">
                  <div className="bubble-tail-in relative flex gap-1 rounded-lg rounded-tl-none bg-white px-3 py-3 shadow-sm" aria-label="João está digitando">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-2 w-2 animate-blink rounded-full bg-[#8696a0]" style={{ animationDelay: `${d * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <form
            className="flex shrink-0 items-end gap-2 bg-[#f0f2f5] px-2 py-2 sm:px-3"
            onSubmit={(e) => {
              e.preventDefault();
              sendText(input);
            }}
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => setLocOpen((o) => !o)}
                aria-label="Anexar: enviar localização"
                aria-expanded={locOpen}
                className="grid h-11 w-11 place-items-center rounded-full text-[#54656f] hover:bg-black/5"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6h-1.5z" />
                </svg>
              </button>
              {locOpen && <LocationMenu onPick={sendLocation} onClose={() => setLocOpen(false)} />}
            </div>
            <label className="sr-only" htmlFor="msg">
              Mensagem
            </label>
            <input
              id="msg"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mensagem"
              autoComplete="off"
              maxLength={2000}
              className="h-11 min-w-0 flex-1 rounded-lg bg-white px-4 text-[15px] text-wa-text placeholder:text-[#667781] focus:outline-none focus-visible:ring-2 focus-visible:ring-wa-header"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Enviar mensagem"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#00a884] text-white transition disabled:opacity-60"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M1.1 21.8 23 12 1.1 2.2 1 9.8l15.7 2.2L1 14.2z" />
              </svg>
            </button>
          </form>

          {list && <ListSheet list={list} onClose={() => setList(null)} onPick={(b) => { setList(null); sendReply(b); }} />}
        </section>

        {/* ------- Painel do modo demo ------- */}
        {demo && (
          <aside className="hidden w-[400px] shrink-0 border-l border-black/10 bg-[#f7f5f2] lg:flex lg:flex-col xl:w-[440px]" aria-label="Painel do modo demo">
            <DemoPanel logs={logs} busy={busy} onScenario={sendText} />
          </aside>
        )}
        {demoOpenMobile && (
          <div className="fixed inset-0 z-40 flex flex-col bg-black/40 lg:hidden" role="dialog" aria-modal="true" aria-label="Painel do modo demo">
            <div className="mt-auto flex max-h-[85dvh] flex-col rounded-t-2xl bg-[#f7f5f2]">
              <div className="flex justify-end p-2">
                <button type="button" onClick={() => setDemoOpenMobile(false)} className="rounded-full px-3 py-1 text-sm font-semibold text-tumelero-marinho hover:bg-black/5">
                  Fechar
                </button>
              </div>
              <DemoPanel
                logs={logs}
                busy={busy}
                onScenario={(t) => {
                  setDemoOpenMobile(false);
                  sendText(t);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Lista interativa (bottom sheet igual ao do WhatsApp) -------------------

function ListSheet({
  list,
  onClose,
  onPick,
}: {
  list: Extract<OutMessage, { type: "list" }>;
  onClose: () => void;
  onPick: (b: ReplyButton) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const rows = list.sections.flatMap((s) => s.rows);
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black/40" role="dialog" aria-modal="true" aria-label={list.button} onClick={onClose}>
      <div className="mt-auto animate-pop rounded-t-2xl bg-white pb-3" onClick={(e) => e.stopPropagation()}>
        <div className="relative border-b border-black/10 px-4 py-3 text-center text-[16px] font-medium">
          <button type="button" onClick={onClose} aria-label="Fechar" className="absolute left-3 top-2.5 grid h-8 w-8 place-items-center rounded-full text-xl text-[#54656f] hover:bg-black/5">
            ×
          </button>
          {list.button}
        </div>
        {list.sections.map((s) => (
          <fieldset key={s.title} className="px-4">
            <legend className="pt-3 text-[13px] font-medium text-[#008069]">{s.title}</legend>
            {s.rows.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-3 border-b border-black/5 py-3 last:border-0">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px]">{r.title}</span>
                  {r.description && <span className="block text-[13px] text-wa-meta">{r.description}</span>}
                </span>
                <input type="radio" name="list" value={r.id} checked={selected === r.id} onChange={() => setSelected(r.id)} className="h-5 w-5 accent-[#00a884]" />
              </label>
            ))}
          </fieldset>
        ))}
        <div className="px-4 pt-3">
          <button
            type="button"
            disabled={!selected}
            onClick={() => {
              const r = rows.find((x) => x.id === selected);
              if (r) onPick({ id: r.id, title: r.title });
            }}
            className="h-11 w-full rounded-full bg-[#00a884] font-medium text-white disabled:bg-[#e9edef] disabled:text-[#8696a0]"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Envio de localização simulado -----------------------------------------

function LocationMenu({ onPick, onClose }: { onPick: (lat: number, lng: number, name?: string) => void; onClose: () => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const useGps = () => {
    if (!navigator.geolocation) return setStatus("Seu navegador não tem GPS.");
    setStatus("Pegando sua localização…");
    navigator.geolocation.getCurrentPosition(
      (p) => onPick(p.coords.latitude, p.coords.longitude, "Localização atual"),
      () => setStatus("Não deu para pegar a localização. Escolha uma da lista."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };
  return (
    <div className="absolute bottom-14 left-0 z-20 w-72 animate-pop overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5" role="menu">
      <p className="flex items-center gap-2 bg-[#f0f2f5] px-4 py-2.5 text-[13px] font-semibold text-[#54656f]">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#1fa855] text-white">📍</span> Enviar localização
      </p>
      <button type="button" role="menuitem" onClick={useGps} className="block w-full px-4 py-2.5 text-left text-[14px] hover:bg-black/5">
        Minha localização atual
      </button>
      {PRESET_LOCATIONS.map((l) => (
        <button key={l.name} type="button" role="menuitem" onClick={() => onPick(l.lat, l.lng, l.name)} className="block w-full px-4 py-2.5 text-left text-[14px] hover:bg-black/5">
          {l.name} <span className="text-[12px] text-wa-meta">(simulada)</span>
        </button>
      ))}
      {status && <p className="px-4 pb-2 text-[12px] text-wa-meta">{status}</p>}
      <button type="button" onClick={onClose} className="w-full border-t border-black/5 px-4 py-2 text-[13px] text-wa-meta hover:bg-black/5">
        Cancelar
      </button>
    </div>
  );
}

// ---- Painel do modo demo ------------------------------------------------------

const TOOL_LABEL: Record<string, string> = {
  buscar_produtos: "🔎 buscar_produtos",
  consultar_promocao: "📜 consultar_promocao",
  calcular_cupons: "🧮 calcular_cupons",
  ofertas_dia_t_hoje: "🏷️ ofertas_dia_t_hoje",
  cadastrar_nota: "🎟️ cadastrar_nota",
  buscar_loja_proxima: "📍 buscar_loja_proxima",
  rastrear_pedido: "🚚 rastrear_pedido",
  consultar_cartao_tumelero: "💳 consultar_cartao_tumelero",
  falar_com_humano: "🙋 falar_com_humano",
  salvar_dados_cliente: "🧠 salvar_dados_cliente",
};

function DemoPanel({ logs, busy, onScenario }: { logs: TurnLog[]; busy: boolean; onScenario: (t: string) => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col font-sans text-tumelero-marinho">
      <div className="border-b border-black/10 px-4 pb-3 pt-4">
        <h2 className="text-lg font-black">Modo demo</h2>
        <p className="text-[13px] text-tumelero-marinho/70">Veja a ferramenta que o João escolheu e os parâmetros de cada resposta.</p>
        <h3 className="mt-3 text-[12px] font-extrabold uppercase tracking-wider text-tumelero-marinho/60">Cenários de teste</h3>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {SCENARIOS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              disabled={busy}
              onClick={() => onScenario(s.text)}
              title={s.text}
              className="rounded-full border border-tumelero-marinho/20 bg-white px-3 py-1 text-[13px] font-semibold hover:border-tumelero-laranja hover:bg-[#fff4ec] disabled:opacity-50"
            >
              {i + 1}. {s.label}
            </button>
          ))}
        </div>
        <details className="mt-3 text-[12.5px]">
          <summary className="cursor-pointer font-bold">Dados fictícios para testar</summary>
          <ul className="mt-1.5 space-y-1">
            {TEST_DATA.map((d) => (
              <li key={d.label}>
                <span className="font-semibold">{d.label}:</span> {d.value}
              </li>
            ))}
          </ul>
        </details>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {logs.length === 0 && <p className="text-[13px] text-tumelero-marinho/60">As chamadas de ferramenta aparecem aqui.</p>}
        {logs.map((l) => (
          <article key={l.id} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5">
            <header className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-[13px] font-bold">“{l.label}”</p>
              <span className="shrink-0 text-[11px] text-tumelero-marinho/60">{(l.ms / 1000).toFixed(1)}s</span>
            </header>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {l.intent && <span className="rounded bg-tumelero-marinho px-1.5 py-0.5 text-[11px] font-bold text-white">intenção: {l.intent}</span>}
              {l.escalated && <span className="rounded bg-tumelero-laranja px-1.5 py-0.5 text-[11px] font-bold text-tumelero-marinho">escalada p/ humano</span>}
              {l.trace.length === 0 && !l.error && <span className="rounded bg-black/5 px-1.5 py-0.5 text-[11px]">sem ferramentas</span>}
              {l.error && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] text-red-800">erro: {l.error}</span>}
            </div>
            {l.trace.map((t, i) => (
              <details key={i} className="mt-2 rounded-lg bg-[#f7f5f2] p-2 text-[12.5px]" open={i === 0}>
                <summary className="cursor-pointer">
                  <span className="font-mono font-bold">{TOOL_LABEL[t.name] ?? t.name}</span>
                  <span className={`ml-1.5 text-[11px] font-bold ${t.ok ? "text-green-700" : "text-red-700"}`}>{t.ok ? "ok" : "erro"}</span>
                  <span className="ml-1 text-[11px] text-tumelero-marinho/50">{t.ms} ms</span>
                  {t.summary && <span className="mt-0.5 block text-tumelero-marinho/80">{t.summary}</span>}
                </summary>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-tumelero-marinho/60">parâmetros</p>
                <pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap break-all rounded bg-tumelero-marinho p-2 font-mono text-[11.5px] text-[#ffe0c7]">{JSON.stringify(t.input, null, 2)}</pre>
                {t.output !== undefined && (
                  <>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-tumelero-marinho/60">resultado</p>
                    <pre className="mt-0.5 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded bg-white p-2 font-mono text-[11.5px] ring-1 ring-black/5">{JSON.stringify(t.output, null, 2)}</pre>
                  </>
                )}
              </details>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}
