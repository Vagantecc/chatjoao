// Implementação em memória: roda sem Supabase usando os dados do seed.
// Útil para desenvolvimento rápido e para os testes do motor.
import { randomUUID } from "node:crypto";
import { materializeSeed, type SeedTables } from "./materialize";
import { PRIMARY_KEY, scoreProduct, type ConversationSummary, type DataStore, type Metrics, type NewCupom, type NewMessage } from "./store";
import type { ConversationRow, CupomRow, MessageRow, TableName } from "./types";

type Tables = SeedTables & {
  conversations: ConversationRow[];
  messages: MessageRow[];
  cupons: CupomRow[];
};

export class MemoryStore implements DataStore {
  readonly kind = "memory" as const;
  private t: Tables;
  private geo = new Map<string, unknown>();
  private seq = 1000;

  constructor(now: Date = new Date()) {
    this.t = { ...materializeSeed(now), conversations: [], messages: [], cupons: [] };
  }

  private nextId() {
    return ++this.seq;
  }

  async getOrCreateConversation(phone: string, channel: ConversationRow["channel"]) {
    let c = this.t.conversations.find((x) => x.phone === phone);
    if (!c) {
      const now = new Date().toISOString();
      c = {
        id: randomUUID(),
        phone,
        channel,
        customer_name: null,
        city: null,
        cep: null,
        lat: null,
        lng: null,
        status: "ativa",
        failed_attempts: 0,
        card_verify_failures: 0,
        escalation_reason: null,
        escalated_at: null,
        created_at: now,
        last_message_at: now,
      };
      this.t.conversations.push(c);
    }
    return { ...c };
  }

  async updateConversation(id: string, patch: Partial<ConversationRow>) {
    const c = this.t.conversations.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
  }

  async resetConversation(phone: string) {
    const c = this.t.conversations.find((x) => x.phone === phone);
    if (!c) return;
    this.t.messages = this.t.messages.filter((m) => m.conversation_id !== c.id);
    this.t.conversations = this.t.conversations.filter((x) => x.id !== c.id);
  }

  async recentMessages(conversationId: string, limit: number) {
    return this.t.messages.filter((m) => m.conversation_id === conversationId).slice(-limit);
  }

  async addMessage(msg: NewMessage) {
    if (msg.wa_message_id && this.t.messages.some((m) => m.wa_message_id === msg.wa_message_id)) return false;
    this.t.messages.push({ ...msg, id: this.nextId(), created_at: new Date().toISOString() });
    return true;
  }

  async listStores() {
    return this.t.stores.filter((s) => s.active);
  }

  async listHolidays(fromDate: string, toDate: string) {
    return this.t.holidays.filter((h) => h.date >= fromDate && h.date <= toDate);
  }

  async searchProducts(terms: string[], limit: number) {
    return this.t.products
      .filter((p) => p.active)
      .map((p) => ({ p, s: scoreProduct(p, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((x) => x.p);
  }

  async ofertasDiaT(date: string) {
    return this.t.ofertas_dia_t.filter((o) => o.date === date);
  }

  async nextOfertasDate(date: string) {
    const dates = this.t.ofertas_dia_t.map((o) => o.date).filter((d) => d >= date).sort();
    return dates[0] ?? null;
  }

  async promoRules() {
    return [...this.t.promo_rules].sort((a, b) => a.sort_order - b.sort_order);
  }

  async cuponsByNota(numeroNf: string) {
    return this.t.cupons.filter((c) => c.numero_nf === numeroNf);
  }

  async addCupons(rows: NewCupom[]) {
    for (const r of rows) this.t.cupons.push({ ...r, id: this.nextId(), created_at: new Date().toISOString() });
  }

  async cupomNumberTaken(mes: string, numero: string) {
    return this.t.cupons.some((c) => c.mes_sorteio === mes && c.numero_sorte === numero);
  }

  async orderByNumber(orderNumber: string) {
    return this.t.mock_orders.find((o) => o.order_number === orderNumber) ?? null;
  }

  async ordersByCpf(cpf: string) {
    return this.t.mock_orders.filter((o) => o.cpf === cpf).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async cardHolderByCpf(cpf: string) {
    return this.t.mock_card_holders.find((c) => c.cpf === cpf) ?? null;
  }

  async geoCacheGet(key: string) {
    return this.geo.get(key);
  }

  async geoCacheSet(key: string, value: unknown) {
    this.geo.set(key, value);
  }

  async listTable<T>(table: TableName) {
    return structuredClone(this.t[table]) as T[];
  }

  async upsertRow(table: TableName, row: Record<string, unknown>) {
    const pk = PRIMARY_KEY[table];
    const rows = this.t[table] as unknown as Record<string, unknown>[];
    const existing = row[pk] !== undefined && row[pk] !== null && row[pk] !== "" ? rows.find((r) => r[pk] === row[pk]) : undefined;
    if (existing) {
      Object.assign(existing, row);
      return { ...existing };
    }
    const created = { ...row, ...(pk === "id" ? { id: this.nextId() } : {}) };
    rows.push(created);
    return { ...created };
  }

  async deleteRow(table: TableName, key: string | number) {
    const pk = PRIMARY_KEY[table];
    (this.t as unknown as Record<string, Record<string, unknown>[]>)[table] = (
      this.t[table] as unknown as Record<string, unknown>[]
    ).filter((r) => String(r[pk]) !== String(key));
  }

  async listConversations(filter?: { status?: ConversationRow["status"] }): Promise<ConversationSummary[]> {
    return this.t.conversations
      .filter((c) => !filter?.status || c.status === filter.status)
      .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
      .map((c) => {
        const msgs = this.t.messages.filter((m) => m.conversation_id === c.id);
        return { ...c, message_count: msgs.length, last_message: msgs.at(-1)?.content ?? null };
      });
  }

  async conversationById(id: string) {
    return this.t.conversations.find((c) => c.id === id) ?? null;
  }

  async allMessages(conversationId: string) {
    return this.t.messages.filter((m) => m.conversation_id === conversationId);
  }

  async metrics(): Promise<Metrics> {
    const intents = new Map<string, number>();
    const tools = new Map<string, number>();
    for (const m of this.t.messages) {
      if (m.role !== "assistant") continue;
      if (m.intent) intents.set(m.intent, (intents.get(m.intent) ?? 0) + 1);
      for (const t of m.tool_calls ?? []) tools.set(t.name, (tools.get(t.name) ?? 0) + 1);
    }
    const sorted = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
    return {
      conversations: this.t.conversations.length,
      escalated: this.t.conversations.filter((c) => c.status === "escalada").length,
      messages: this.t.messages.length,
      intents: sorted(intents).map(([intent, total]) => ({ intent, total })),
      tools: sorted(tools).map(([tool, total]) => ({ tool, total })),
    };
  }
}
