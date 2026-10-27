import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PRIMARY_KEY, scoreProduct, type ConversationSummary, type DataStore, type Metrics, type NewCupom, type NewMessage } from "./store";
import type {
  ConversationRow,
  CupomRow,
  HolidayRow,
  MessageRow,
  MockCardHolderRow,
  MockOrderRow,
  OfertaDiaTRow,
  ProductRow,
  PromoRuleRow,
  StoreRow,
  TableName,
} from "./types";

const UNIQUE_VIOLATION = "23505";

function must<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data as T;
}

export class SupabaseStore implements DataStore {
  readonly kind = "supabase" as const;
  private db: SupabaseClient;
  private productsCache: { at: number; rows: ProductRow[] } | null = null;

  constructor(url: string, serviceRoleKey: string) {
    this.db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async getOrCreateConversation(phone: string, channel: ConversationRow["channel"]) {
    const found = must(await this.db.from("conversations").select("*").eq("phone", phone).maybeSingle());
    if (found) return found as ConversationRow;
    const res = await this.db.from("conversations").insert({ phone, channel }).select("*").single();
    if (res.error?.code === UNIQUE_VIOLATION) {
      // Duas mensagens chegaram juntas: a outra requisição criou primeiro.
      return must(await this.db.from("conversations").select("*").eq("phone", phone).single()) as ConversationRow;
    }
    return must(res) as ConversationRow;
  }

  async updateConversation(id: string, patch: Partial<ConversationRow>) {
    must(await this.db.from("conversations").update(patch).eq("id", id));
  }

  async resetConversation(phone: string) {
    must(await this.db.from("conversations").delete().eq("phone", phone));
  }

  async recentMessages(conversationId: string, limit: number) {
    const rows = must(
      await this.db
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit),
    ) as MessageRow[];
    return rows.reverse();
  }

  async addMessage(msg: NewMessage) {
    const res = await this.db.from("messages").insert(msg);
    if (res.error?.code === UNIQUE_VIOLATION) return false;
    must(res);
    return true;
  }

  async listStores() {
    return must(await this.db.from("stores").select("*").eq("active", true).order("id")) as StoreRow[];
  }

  async listHolidays(fromDate: string, toDate: string) {
    return must(await this.db.from("holidays").select("*").gte("date", fromDate).lte("date", toDate)) as HolidayRow[];
  }

  async searchProducts(terms: string[], limit: number) {
    // Catálogo de fallback é pequeno: carrega tudo (com cache curto) e pontua em memória.
    if (!this.productsCache || Date.now() - this.productsCache.at > 60_000) {
      const rows = must(await this.db.from("products").select("*").eq("active", true)) as ProductRow[];
      this.productsCache = { at: Date.now(), rows: rows.map((r) => ({ ...r, price: Number(r.price) })) };
    }
    return this.productsCache.rows
      .map((p) => ({ p, s: scoreProduct(p, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((x) => x.p);
  }

  async ofertasDiaT(date: string) {
    const rows = must(await this.db.from("ofertas_dia_t").select("*").eq("date", date).order("id")) as OfertaDiaTRow[];
    return rows.map((r) => ({ ...r, price: Number(r.price), normal_price: r.normal_price === null ? null : Number(r.normal_price) }));
  }

  async nextOfertasDate(date: string) {
    const rows = must(
      await this.db.from("ofertas_dia_t").select("date").gte("date", date).order("date").limit(1),
    ) as { date: string }[];
    return rows[0]?.date ?? null;
  }

  async promoRules() {
    return must(await this.db.from("promo_rules").select("*").order("sort_order")) as PromoRuleRow[];
  }

  async cuponsByNota(numeroNf: string) {
    return must(await this.db.from("cupons").select("*").eq("numero_nf", numeroNf)) as CupomRow[];
  }

  async addCupons(rows: NewCupom[]) {
    must(await this.db.from("cupons").insert(rows));
  }

  async cupomNumberTaken(mes: string, numero: string) {
    const rows = must(
      await this.db.from("cupons").select("id").eq("mes_sorteio", mes).eq("numero_sorte", numero).limit(1),
    ) as unknown[];
    return rows.length > 0;
  }

  async orderByNumber(orderNumber: string) {
    return must(await this.db.from("mock_orders").select("*").eq("order_number", orderNumber).maybeSingle()) as MockOrderRow | null;
  }

  async ordersByCpf(cpf: string) {
    return must(
      await this.db.from("mock_orders").select("*").eq("cpf", cpf).order("created_at", { ascending: false }),
    ) as MockOrderRow[];
  }

  async cardHolderByCpf(cpf: string) {
    return must(await this.db.from("mock_card_holders").select("*").eq("cpf", cpf).maybeSingle()) as MockCardHolderRow | null;
  }

  async geoCacheGet(key: string) {
    const row = must(await this.db.from("geo_cache").select("value").eq("key", key).maybeSingle()) as { value: unknown } | null;
    return row ? row.value : undefined;
  }

  async geoCacheSet(key: string, value: unknown) {
    must(await this.db.from("geo_cache").upsert({ key, value }));
  }

  async listTable<T>(table: TableName) {
    const pk = PRIMARY_KEY[table];
    return must(await this.db.from(table).select("*").order(pk).limit(1000)) as T[];
  }

  async upsertRow(table: TableName, row: Record<string, unknown>) {
    const pk = PRIMARY_KEY[table];
    const { [pk]: key, ...rest } = row;
    if (key === undefined || key === null || key === "") {
      return must(await this.db.from(table).insert(rest).select("*").single()) as Record<string, unknown>;
    }
    if (pk === "id") {
      return must(await this.db.from(table).update(rest).eq(pk, key).select("*").single()) as Record<string, unknown>;
    }
    return must(await this.db.from(table).upsert(row).select("*").single()) as Record<string, unknown>;
  }

  async deleteRow(table: TableName, key: string | number) {
    must(await this.db.from(table).delete().eq(PRIMARY_KEY[table], key));
  }

  async listConversations(filter?: { status?: ConversationRow["status"] }): Promise<ConversationSummary[]> {
    let q = this.db.from("conversations").select("*, messages(count)").order("last_message_at", { ascending: false }).limit(200);
    if (filter?.status) q = q.eq("status", filter.status);
    const rows = must(await q) as (ConversationRow & { messages: { count: number }[] })[];
    return rows.map(({ messages, ...c }) => ({ ...c, message_count: messages[0]?.count ?? 0, last_message: null }));
  }

  async conversationById(id: string) {
    return must(await this.db.from("conversations").select("*").eq("id", id).maybeSingle()) as ConversationRow | null;
  }

  async allMessages(conversationId: string) {
    return must(
      await this.db.from("messages").select("*").eq("conversation_id", conversationId).order("created_at").order("id"),
    ) as MessageRow[];
  }

  async metrics(): Promise<Metrics> {
    const [conv, esc, msgs, intents, tools] = await Promise.all([
      this.db.from("conversations").select("id", { count: "exact", head: true }),
      this.db.from("conversations").select("id", { count: "exact", head: true }).eq("status", "escalada"),
      this.db.from("messages").select("id", { count: "exact", head: true }),
      this.db.from("admin_metrics_intents").select("*"),
      this.db.from("admin_metrics_tools").select("*"),
    ]);
    return {
      conversations: conv.count ?? 0,
      escalated: esc.count ?? 0,
      messages: msgs.count ?? 0,
      intents: must(intents) as Metrics["intents"],
      tools: must(tools) as Metrics["tools"],
    };
  }
}
