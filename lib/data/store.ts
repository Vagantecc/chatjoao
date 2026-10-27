// Contrato de acesso a dados usado pelo motor, pelas ferramentas e pelo admin.
// Duas implementações: Supabase (produção) e memória (dev sem banco e testes).
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

export type NewMessage = Omit<MessageRow, "id" | "created_at">;
export type NewCupom = Omit<CupomRow, "id" | "created_at">;

export interface ConversationSummary extends ConversationRow {
  message_count: number;
  last_message: string | null;
}

export interface Metrics {
  conversations: number;
  escalated: number;
  messages: number;
  intents: { intent: string; total: number }[];
  tools: { tool: string; total: number }[];
}

export interface DataStore {
  readonly kind: "supabase" | "memory";

  // Conversas
  getOrCreateConversation(phone: string, channel: ConversationRow["channel"]): Promise<ConversationRow>;
  updateConversation(id: string, patch: Partial<ConversationRow>): Promise<void>;
  resetConversation(phone: string): Promise<void>;
  /** Últimas `limit` mensagens, em ordem cronológica. */
  recentMessages(conversationId: string, limit: number): Promise<MessageRow[]>;
  /** Grava a mensagem. Devolve false se `wa_message_id` já existia (webhook repetido). */
  addMessage(msg: NewMessage): Promise<boolean>;

  // Catálogo e lojas
  listStores(): Promise<StoreRow[]>;
  listHolidays(fromDate: string, toDate: string): Promise<HolidayRow[]>;
  searchProducts(terms: string[], limit: number): Promise<ProductRow[]>;
  ofertasDiaT(date: string): Promise<OfertaDiaTRow[]>;
  /** Próxima data com Ofertas do Dia T a partir de `date` (inclusive). */
  nextOfertasDate(date: string): Promise<string | null>;

  // Promoção
  promoRules(): Promise<PromoRuleRow[]>;
  cuponsByNota(numeroNf: string): Promise<CupomRow[]>;
  addCupons(rows: NewCupom[]): Promise<void>;
  cupomNumberTaken(mes: string, numero: string): Promise<boolean>;

  // Simulações
  orderByNumber(orderNumber: string): Promise<MockOrderRow | null>;
  ordersByCpf(cpf: string): Promise<MockOrderRow[]>;
  cardHolderByCpf(cpf: string): Promise<MockCardHolderRow | null>;

  // Cache de geocodificação
  geoCacheGet(key: string): Promise<unknown | undefined>;
  geoCacheSet(key: string, value: unknown): Promise<void>;

  // Admin
  listTable<T = Record<string, unknown>>(table: TableName): Promise<T[]>;
  upsertRow(table: TableName, row: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteRow(table: TableName, key: string | number): Promise<void>;
  listConversations(filter?: { status?: ConversationRow["status"] }): Promise<ConversationSummary[]>;
  conversationById(id: string): Promise<ConversationRow | null>;
  allMessages(conversationId: string): Promise<MessageRow[]>;
  metrics(): Promise<Metrics>;
}

/** Chave primária de cada tabela editável no admin. */
export const PRIMARY_KEY: Record<TableName, string> = {
  stores: "id",
  holidays: "date",
  products: "id",
  promo_rules: "id",
  ofertas_dia_t: "id",
  cupons: "id",
  mock_orders: "id",
  mock_card_holders: "id",
  conversations: "id",
  messages: "id",
};

/** Normaliza texto para busca: minúsculo e sem acento. */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Pontua um produto contra os termos de busca (usado pelas duas implementações). */
export function scoreProduct(p: Pick<ProductRow, "name" | "keywords" | "subcategory" | "category">, terms: string[]): number {
  const name = fold(p.name);
  const kws = p.keywords.map(fold);
  const cat = fold(`${p.category} ${p.subcategory ?? ""}`);
  let score = 0;
  for (const raw of terms) {
    const term = fold(raw).trim();
    if (!term) continue;
    if (name.includes(term)) score += 5;
    if (kws.some((k) => k === term)) score += 4;
    else if (kws.some((k) => k.includes(term) || term.includes(k))) score += 2;
    if (cat.includes(term)) score += 1;
    for (const word of term.split(/\s+/).filter((w) => w.length > 3)) {
      if (name.includes(word)) score += 1;
    }
  }
  return score;
}
