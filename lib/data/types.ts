// Linhas das tabelas do Supabase. Os nomes de coluna batem com /supabase/migrations.

export type TimeRange = [string, string]; // ["08:00", "19:00"]

export type WeekdayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface StoreHours {
  week: Partial<Record<WeekdayKey, TimeRange[]>>;
  /** Horário em feriados. Ausente = loja não informou (o João manda confirmar). Lista vazia = fechada. */
  holiday?: TimeRange[];
  /** Exceções sazonais, ex.: domingos de outubro a fevereiro no litoral. */
  seasonal?: { months: number[]; day: WeekdayKey; ranges: TimeRange[] }[];
  /** Texto livre mostrado quando o horário ainda não foi cadastrado. */
  note?: string;
}

export interface StoreRow {
  id: number;
  slug: string;
  name: string;
  address: string;
  neighborhood: string | null;
  city: string;
  cep: string | null;
  lat: number;
  lng: number;
  whatsapp: string[];
  phone: string | null;
  hours: StoreHours | null;
  active: boolean;
}

export interface HolidayRow {
  date: string; // YYYY-MM-DD
  name: string;
  scope: "nacional" | "estadual" | "municipal";
  city: string | null;
}

export interface ProductRow {
  id: number;
  name: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  price: number;
  link: string;
  image_url: string | null;
  keywords: string[];
  active: boolean;
}

export interface PromoRuleRow {
  id: number;
  slug: string;
  title: string;
  content: string;
  keywords: string[];
  sort_order: number;
}

export interface OfertaDiaTRow {
  id: number;
  product_name: string;
  price: number;
  normal_price: number | null;
  link: string;
  image_url: string | null;
  date: string; // YYYY-MM-DD
}

export interface CupomRow {
  id: number;
  numero_sorte: string;
  cpf: string;
  numero_nf: string;
  valor_nf: number;
  valor_dia_t: number;
  mes_sorteio: string; // YYYY-MM
  conversation_id: string | null;
  created_at: string;
}

export type OrderStatus =
  | "pagamento_aprovado"
  | "separando"
  | "saiu_para_entrega"
  | "entregue"
  | "retirada_disponivel"
  | "atrasado";

export interface MockOrderRow {
  id: number;
  order_number: string;
  cpf: string;
  customer_name: string;
  status: OrderStatus;
  delivery_type: "entrega" | "retirada";
  store_slug: string | null;
  items: { name: string; qty: number; price: number }[];
  total: number;
  timeline: { status: OrderStatus; at: string }[];
  eta: string | null;
  created_at: string;
}

export interface MockCardHolderRow {
  id: number;
  cpf: string;
  birth_date: string; // YYYY-MM-DD
  name: string;
  last4: string;
  limit_total: number;
  limit_available: number;
  invoice: { amount: number; due_date: string; closing_date: string; status: "aberta" | "fechada" | "paga" };
  open_debts: { description: string; amount: number; due_date: string }[];
  recent_purchases: { date: string; description: string; amount: number; installments?: string }[];
}

export type ConversationStatus = "ativa" | "escalada";

export interface ConversationRow {
  id: string;
  phone: string;
  channel: "web" | "whatsapp";
  customer_name: string | null;
  city: string | null;
  cep: string | null;
  lat: number | null;
  lng: number | null;
  status: ConversationStatus;
  failed_attempts: number;
  card_verify_failures: number;
  escalation_reason: string | null;
  escalated_at: string | null;
  created_at: string;
  last_message_at: string;
}

export interface ToolCallLog {
  name: string;
  input: unknown;
  ok: boolean;
  ms: number;
  summary?: string;
}

export interface MessageRow {
  id: number;
  conversation_id: string;
  role: "user" | "assistant";
  /** Texto que entra no histórico do modelo (já mascarado). */
  content: string;
  /** Mensagens estruturadas enviadas ao cliente (só para o assistente). */
  payload: unknown | null;
  tool_calls: ToolCallLog[] | null;
  intent: string | null;
  wa_message_id: string | null;
  created_at: string;
}

export type TableName =
  | "stores"
  | "holidays"
  | "products"
  | "promo_rules"
  | "ofertas_dia_t"
  | "cupons"
  | "mock_orders"
  | "mock_card_holders"
  | "conversations"
  | "messages";
