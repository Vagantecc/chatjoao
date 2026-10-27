// Motor único do João da Obra: recebe telefone + mensagem, carrega o histórico,
// roda o loop de ferramentas no Claude e devolve as mensagens para o canal.
// Usado pelo simulador (/api/chat) e pelo webhook do WhatsApp.
import type Anthropic from "@anthropic-ai/sdk";
import type { DataStore } from "./data/store";
import type { ConversationRow, MessageRow } from "./data/types";
import type { Geocoder } from "./geo/geocode";
import type { LlmCall } from "./llm";
import { clip, messageToText, type BrainResult, type InMessage, type OutMessage, type ToolTrace, WA_LIMITS } from "./messages";
import { maskSensitive } from "./privacy/mask";
import { JOAO_SYSTEM_PROMPT, WELCOME_TEXT } from "./prompts/joao";
import type { CardProvider } from "./providers/card";
import type { OrderProvider } from "./providers/order";
import { formatDateBR, localParts, WEEKDAY_PT } from "./time";
import { ESCALATION_MESSAGE } from "./tools/falar-com-humano";
import { anthropicTools, TOOLS_BY_NAME } from "./tools/index";
import { RESPONDER_NAME, responderSchema, type ResponderInput } from "./tools/responder";
import { Attachments, ToolInputError, type ToolContext } from "./tools/types";
import type { Catalog } from "./vtex/catalog";

export const HISTORY_LIMIT = 20;
const MAX_ITERATIONS = 6;
const MAX_FAILED_ATTEMPTS = 2;

export interface BrainDeps {
  store: DataStore;
  catalog: Catalog;
  geocoder: Geocoder;
  orders: OrderProvider;
  cards: CardProvider;
  llm: LlmCall;
  now?: () => Date;
}

export interface IncomingParams {
  phone: string;
  channel: ConversationRow["channel"];
  message: InMessage;
  /** id da mensagem no WhatsApp, para ignorar entregas repetidas do webhook. */
  waMessageId?: string;
}

export interface IncomingResult extends BrainResult {
  duplicate?: boolean;
}

// ---- Mensagens fixas -------------------------------------------------------

export const START_COMMAND = "__start__";
const BACK_TO_BOT_ID = "voltar_joao";

const MAIN_BUTTONS = [
  { id: "menu_produto", title: "Achar um produto" },
  { id: "menu_promo", title: "Promoção 60 anos 🚗" },
  { id: "menu_loja", title: "Loja mais perto" },
];

export function welcomeMessages(name?: string | null): OutMessage[] {
  return [
    {
      type: "buttons",
      text: name ? WELCOME_TEXT.replace("Opa!", `Opa, ${name}!`) : WELCOME_TEXT,
      buttons: MAIN_BUTTONS,
    },
    {
      type: "list",
      text: "Ou escolhe uma destas:",
      button: "Mais opções",
      sections: [
        {
          title: "Mais opções",
          rows: [
            { id: "menu_pedido", title: "Rastrear pedido", description: "Veja onde está sua compra" },
            { id: "menu_cartao", title: "Cartão Tumelero", description: "Fatura, limite, boleto e Pix" },
            { id: "menu_humano", title: "Falar com atendente", description: "Um colega da Tumelero te ajuda" },
          ],
        },
      ],
    },
  ];
}

const GREETING_RE =
  /^\s*(oi+e?|ol[aá]+|opa+|e\s*a[ií]|eae|bom\s+dia|boa\s+tarde|boa\s+noite|hey|hello|hi|salve|al[oô]|tudo\s+(bem|bom|certo)|menu|in[ií]cio|come[cç]ar)[\s!.,?😀-🙏]*(jo[aã]o)?[\s!.,?]*$/iu;

const FALLBACK_ERROR: OutMessage[] = [
  {
    type: "buttons",
    text: "Bah, deu um probleminha aqui do meu lado. 🧱 Pode tentar de novo daqui a pouquinho?",
    buttons: [
      { id: "retry", title: "Tentar de novo" },
      { id: "menu_humano", title: "Falar com atendente" },
    ],
  },
];

// ---- Motor -----------------------------------------------------------------

export async function handleIncoming(deps: BrainDeps, params: IncomingParams): Promise<IncomingResult> {
  const now = deps.now?.() ?? new Date();
  const store = deps.store;
  const conversation = await store.getOrCreateConversation(params.phone, params.channel);
  const patch: Partial<ConversationRow> = {};

  const previous = await store.recentMessages(conversation.id, HISTORY_LIMIT);
  const firstContact = previous.length === 0;

  // 1. Mensagem do cliente → texto para o histórico (com dados sensíveis mascarados).
  let userText: string;
  let sensitive: string[] = [];
  const msg = params.message;
  if (msg.type === "text") {
    const masked = maskSensitive(msg.text);
    userText = masked.text;
    sensitive = masked.found;
  } else if (msg.type === "reply") {
    userText = msg.title;
  } else {
    patch.lat = msg.lat;
    patch.lng = msg.lng;
    userText = `📍 [Localização enviada${msg.name ? `: ${msg.name}` : ""}${msg.address ? `, ${msg.address}` : ""}]`;
  }

  const isStart = msg.type === "text" && msg.text.trim() === START_COMMAND;
  if (!isStart) {
    const saved = await store.addMessage({
      conversation_id: conversation.id,
      role: "user",
      content: userText,
      payload: msg.type === "text" ? null : msg,
      tool_calls: null,
      intent: null,
      wa_message_id: params.waMessageId ?? null,
    });
    if (!saved) return { messages: [], trace: [], intent: null, escalated: false, duplicate: true };
  }

  const finish = async (messages: OutMessage[], trace: ToolTrace[], intent: string | null): Promise<IncomingResult> => {
    await store.addMessage({
      conversation_id: conversation.id,
      role: "assistant",
      content: messages.map(messageToText).join("\n"),
      payload: messages,
      tool_calls: trace.length ? trace.map(({ output: _o, ...t }) => t) : null,
      intent,
      wa_message_id: null,
    });
    await store.updateConversation(conversation.id, { ...patch, last_message_at: new Date().toISOString() });
    const status = patch.status ?? conversation.status;
    return { messages, trace, intent, escalated: status === "escalada" };
  };

  // 2. Atalhos que não precisam do modelo.
  if (isStart || (firstContact && msg.type === "text" && GREETING_RE.test(msg.text))) {
    return finish(welcomeMessages(conversation.customer_name), [], "saudacao");
  }
  if (conversation.status === "escalada") {
    if (msg.type === "reply" && msg.id === BACK_TO_BOT_ID) {
      patch.status = "ativa";
      patch.failed_attempts = 0;
      return finish(
        [{ type: "buttons", text: "Voltei! 🔨 Me conta, no que posso te ajudar?", buttons: MAIN_BUTTONS }],
        [],
        "saudacao",
      );
    }
    return finish(
      [
        {
          type: "buttons",
          text: "Já chamei um colega da Tumelero, tá? Ele vai ler tudo o que tu escreveu aqui. Se preferir, o atendimento geral é o (51) 99811-1390. 🙌",
          buttons: [{ id: BACK_TO_BOT_ID, title: "Voltar pro João" }],
        },
      ],
      [],
      "humano",
    );
  }

  // 3. Histórico + contexto do turno.
  const history = await store.recentMessages(conversation.id, HISTORY_LIMIT);
  const messages = buildHistory(history, contextBlock({ conversation: { ...conversation, ...patch }, now, firstContact, sensitive, channel: params.channel, sentLocation: msg.type === "location" }));

  // 4. Loop de ferramentas.
  const attachments = new Attachments();
  const ctx: ToolContext = {
    store,
    catalog: deps.catalog,
    geocoder: deps.geocoder,
    orders: deps.orders,
    cards: deps.cards,
    conversation,
    now,
    attachments,
    patch,
  };
  const trace: ToolTrace[] = [];
  let reply: ResponderInput | null = null;
  let looseText: string | null = null;

  try {
    for (let i = 0; i < MAX_ITERATIONS && !reply; i++) {
      const res = await deps.llm({
        system: [{ type: "text", text: JOAO_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: anthropicTools(),
        tool_choice: { type: "auto" },
        messages,
      });

      if (res.stop_reason === "refusal") break;
      const toolUses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (toolUses.length === 0) {
        const text = res.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        if (text) looseText = text;
        break;
      }

      messages.push({ role: "assistant", content: res.content as Anthropic.Beta.BetaContentBlockParam[] });

      // Ferramentas de dados primeiro (em paralelo); a resposta por último, porque cita os anexos.
      const dataUses = toolUses.filter((t) => t.name !== RESPONDER_NAME);
      const responderUse = toolUses.find((t) => t.name === RESPONDER_NAME);
      const results = new Map<string, Anthropic.Beta.BetaToolResultBlockParam>();
      await Promise.all(
        dataUses.map(async (use) => {
          const r = await runTool(use, ctx);
          trace.push(r.trace);
          results.set(use.id, r.result);
        }),
      );

      if (responderUse) {
        const parsed = responderSchema.safeParse(responderUse.input);
        const problems = parsed.success ? checkReply(parsed.data, attachments) : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
        if (parsed.success && problems.length === 0) {
          reply = parsed.data;
        } else {
          results.set(responderUse.id, {
            type: "tool_result",
            tool_use_id: responderUse.id,
            is_error: true,
            content: `Resposta não enviada. Corrija e chame responder de novo: ${problems.join("; ")}`,
          });
        }
      }
      for (const extra of toolUses.filter((t) => t.name === RESPONDER_NAME && t !== responderUse)) {
        results.set(extra.id, { type: "tool_result", tool_use_id: extra.id, is_error: true, content: "Chame responder uma vez só." });
      }
      if (reply) break;
      messages.push({ role: "user", content: toolUses.map((t) => results.get(t.id) ?? okResult(t.id)) });
    }
  } catch (err) {
    console.error("[joao-brain] falha no LLM:", err);
    return finish(FALLBACK_ERROR, trace, null);
  }

  // 5. Monta as mensagens de saída.
  let out: OutMessage[];
  let intent: string | null = null;
  if (reply) {
    out = renderReply(reply, attachments);
    intent = reply.intencao;
    if (reply.resolvido === "nao") patch.failed_attempts = (conversation.failed_attempts ?? 0) + 1;
    else if (reply.resolvido === "sim") patch.failed_attempts = 0;
  } else if (looseText) {
    out = looseText
      .split(/\n{2,}/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 4)
      .map((text) => ({ type: "text", text: clip(text, WA_LIMITS.text) }));
  } else {
    out = [
      {
        type: "buttons",
        text: "Hmm, essa eu não consigo te responder por aqui. Quer que eu chame um colega da Tumelero?",
        buttons: [{ id: "menu_humano", title: "Falar com atendente" }],
      },
    ];
    patch.failed_attempts = (conversation.failed_attempts ?? 0) + 1;
  }

  // 6. Escala para humano: a pedido (ferramenta) ou depois de 2 tentativas sem resolver.
  const escalatedNow = patch.status === "escalada"; // conversas já escaladas saíram lá em cima
  if (!escalatedNow && (patch.failed_attempts ?? 0) >= MAX_FAILED_ATTEMPTS) {
    patch.status = "escalada";
    patch.escalation_reason = "2 tentativas sem resolver";
    patch.escalated_at = now.toISOString();
    patch.failed_attempts = 0;
    trace.push({ name: "falar_com_humano", input: { motivo: "automático: 2 tentativas sem resolver" }, ok: true, ms: 0, summary: "escalada automática" });
    out.push({ type: "text", text: ESCALATION_MESSAGE });
    intent = "humano";
  } else if (escalatedNow && !out.some((m) => "text" in m && m.text.includes("Vou chamar um colega"))) {
    out.push({ type: "text", text: ESCALATION_MESSAGE });
  }

  return finish(out, trace, intent);
}

// ---- Partes do motor -------------------------------------------------------

function okResult(id: string): Anthropic.Beta.BetaToolResultBlockParam {
  return { type: "tool_result", tool_use_id: id, content: "ok" };
}

async function runTool(use: Anthropic.Beta.BetaToolUseBlock, ctx: ToolContext) {
  const started = Date.now();
  const tool = TOOLS_BY_NAME.get(use.name);
  const fail = (message: string) => ({
    trace: { name: use.name, input: use.input, ok: false, ms: Date.now() - started, summary: message },
    result: { type: "tool_result" as const, tool_use_id: use.id, is_error: true, content: message },
  });
  if (!tool) return fail(`Ferramenta desconhecida: ${use.name}`);
  const parsed = tool.schema.safeParse(use.input);
  if (!parsed.success) return fail(`Parâmetros inválidos: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  try {
    const out = await tool.run(parsed.data, ctx);
    return {
      trace: { name: use.name, input: use.input, ok: true, ms: Date.now() - started, summary: out.summary, output: out.data },
      result: { type: "tool_result" as const, tool_use_id: use.id, content: JSON.stringify(out.data) },
    };
  } catch (err) {
    if (err instanceof ToolInputError) return fail(err.message);
    console.error(`[joao-brain] erro em ${use.name}:`, err);
    return fail("A ferramenta falhou agora. Peça desculpas com leveza e ofereça outro caminho (site, loja ou atendente).");
  }
}

function checkReply(r: ResponderInput, attachments: Attachments): string[] {
  const problems: string[] = [];
  for (const id of r.anexos ?? []) if (!attachments.has(id)) problems.push(`anexo "${id}" não existe neste turno (use só ids devolvidos pelas ferramentas)`);
  if (r.botoes?.length && r.lista) problems.push("use botoes OU lista, não os dois");
  for (const b of r.botoes ?? []) if ([...b].length > WA_LIMITS.buttonTitle) problems.push(`botão "${b}" passa de 20 caracteres`);
  for (const t of r.baloes) if (/\[[^\]]+\]\(https?:/.test(t)) problems.push("não use links em markdown [texto](url); escreva a URL solta");
  return problems;
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);

/** Converte a resposta estruturada em mensagens: 1º balão, anexos, demais balões; botões/lista no último. */
export function renderReply(r: ResponderInput, attachments: Attachments): OutMessage[] {
  const baloes = r.baloes.map((b) => b.replace(/\*\*(.+?)\*\*/g, "*$1*").trim()).filter(Boolean);
  const anexos = (r.anexos ?? []).flatMap((id) => attachments.get(id) ?? []);
  const texts: OutMessage[] = baloes.map((text) => ({ type: "text", text: clip(text, WA_LIMITS.text) }));
  const out: OutMessage[] = [...texts.slice(0, 1), ...anexos, ...texts.slice(1)];

  const interactive = r.botoes?.length || r.lista;
  if (!interactive) return out;

  // O texto do último balão vira o corpo da mensagem interativa (se ele vier depois dos anexos).
  let body = "Posso ajudar em mais alguma coisa?";
  const last = out.at(-1);
  if (last?.type === "text" && (anexos.length === 0 || texts.length > 1)) {
    body = last.text;
    out.pop();
  }
  body = clip(body, WA_LIMITS.body);

  if (r.botoes?.length) {
    out.push({
      type: "buttons",
      text: body,
      buttons: r.botoes.slice(0, WA_LIMITS.buttons).map((title, i) => ({ id: `btn_${i + 1}_${slug(title)}`, title: clip(title, WA_LIMITS.buttonTitle) })),
    });
  } else if (r.lista) {
    out.push({
      type: "list",
      text: body,
      button: clip(r.lista.botao, WA_LIMITS.listButton),
      sections: [
        {
          title: clip(r.lista.botao, WA_LIMITS.sectionTitle),
          rows: r.lista.opcoes.slice(0, WA_LIMITS.listRows).map((o, i) => ({
            id: `opt_${i + 1}_${slug(o.titulo)}`,
            title: clip(o.titulo, WA_LIMITS.rowTitle),
            ...(o.descricao ? { description: clip(o.descricao, WA_LIMITS.rowDescription) } : {}),
          })),
        },
      ],
    });
  }
  return out;
}

function contextBlock(p: {
  conversation: ConversationRow;
  now: Date;
  firstContact: boolean;
  sensitive: string[];
  channel: ConversationRow["channel"];
  sentLocation: boolean;
}): string {
  const lp = localParts(p.now);
  const hh = String(Math.floor(lp.minutes / 60)).padStart(2, "0");
  const mm = String(lp.minutes % 60).padStart(2, "0");
  const c = p.conversation;
  const lines = [
    `agora: ${WEEKDAY_PT[lp.weekday]}, ${formatDateBR(lp.date)}, ${hh}h${mm} (horário de Brasília)`,
    `canal: ${p.channel === "whatsapp" ? "WhatsApp" : "simulador web do WhatsApp"}`,
    `cliente: nome ${c.customer_name ?? "não informado"}; cidade ${c.city ?? "não informada"}; CEP ${c.cep ?? "não informado"}`,
  ];
  if (p.firstContact) lines.push("primeiro contato: apresente-se em meia frase como João da Obra antes de ajudar");
  if (p.sentLocation) lines.push("o cliente acabou de enviar a localização: use buscar_loja_proxima com usar_localizacao_enviada=true");
  if (p.sensitive.length)
    lines.push(
      `ATENÇÃO: o cliente mandou ${p.sensitive.join(", ")} e o sistema apagou antes de chegar aqui. Avise com carinho que nunca deve mandar esses dados por mensagem e que você não precisa deles.`,
    );
  if (c.failed_attempts >= 1) lines.push("a última tentativa não resolveu: se não der de novo, ofereça um atendente");
  return `[contexto]\n${lines.map((l) => `- ${l}`).join("\n")}\n[/contexto]`;
}

/** Histórico do banco → mensagens da API (só texto; turnos alternados; começa com o cliente). */
export function buildHistory(rows: MessageRow[], context: string): Anthropic.Beta.BetaMessageParam[] {
  const out: { role: "user" | "assistant"; text: string }[] = [];
  for (const r of rows) {
    const last = out.at(-1);
    if (last && last.role === r.role) last.text += `\n${r.content}`;
    else out.push({ role: r.role, text: r.content });
  }
  // A API exige começar pelo cliente. Janela cortada: descarta a sobra do João; conversa curta: marca o início.
  if (out[0]?.role === "assistant") {
    if (rows.length >= HISTORY_LIMIT) out.shift();
    else out.unshift({ role: "user", text: "[início da conversa]" });
  }
  if (out.at(-1)?.role !== "user") out.push({ role: "user", text: "[o cliente não escreveu nada novo]" });
  return out.map((m, i) =>
    i === out.length - 1
      ? { role: "user", content: [{ type: "text", text: m.text }, { type: "text", text: context }] }
      : { role: m.role, content: m.text },
  );
}
