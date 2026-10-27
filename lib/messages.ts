// Formato de saída do motor. O simulador desenha estas mensagens e o webhook
// converte cada uma para o tipo equivalente da WhatsApp Cloud API.

export interface ReplyButton {
  id: string;
  title: string; // até 20 caracteres
}

export interface ListRow {
  id: string;
  title: string; // até 24 caracteres
  description?: string; // até 72 caracteres
}

export interface ProductCard {
  name: string;
  price: number;
  listPrice?: number | null;
  imageUrl?: string | null;
  link: string;
  badge?: string; // ex.: "Oferta do Dia T"
}

export type OutMessage =
  | { type: "text"; text: string }
  | { type: "buttons"; text: string; buttons: ReplyButton[] }
  | { type: "list"; text: string; button: string; sections: { title: string; rows: ListRow[] }[] }
  | { type: "product"; product: ProductCard }
  | { type: "location"; lat: number; lng: number; name: string; address: string }
  | { type: "cta"; text: string; label: string; url: string }
  | { type: "document"; url: string; filename: string; caption?: string };

/** Mensagem que chega do cliente (texto, toque em botão/lista ou localização). */
export type InMessage =
  | { type: "text"; text: string }
  | { type: "reply"; id: string; title: string }
  | { type: "location"; lat: number; lng: number; name?: string; address?: string };

/** Registro da chamada de ferramenta, mostrado no painel do modo demo. */
export interface ToolTrace {
  name: string;
  input: unknown;
  ok: boolean;
  ms: number;
  summary?: string;
  output?: unknown;
}

export interface BrainResult {
  messages: OutMessage[];
  trace: ToolTrace[];
  intent: string | null;
  escalated: boolean;
}

export const WA_LIMITS = {
  buttons: 3,
  buttonTitle: 20,
  listRows: 10,
  listButton: 20,
  rowTitle: 24,
  rowDescription: 72,
  sectionTitle: 24,
  body: 1024,
  text: 4096,
} as const;

export function clip(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

/** Texto de uma mensagem de saída, para histórico e admin. */
export function messageToText(m: OutMessage): string {
  switch (m.type) {
    case "text":
      return m.text;
    case "buttons":
      return `${m.text}\n[botões: ${m.buttons.map((b) => b.title).join(" | ")}]`;
    case "list":
      return `${m.text}\n[lista "${m.button}": ${m.sections.flatMap((s) => s.rows.map((r) => r.title)).join(" | ")}]`;
    case "product":
      return `[card: ${m.product.name} — R$ ${m.product.price.toFixed(2)} — ${m.product.link}]`;
    case "location":
      return `[localização: ${m.name}, ${m.address}]`;
    case "cta":
      return `${m.text}\n[link "${m.label}": ${m.url}]`;
    case "document":
      return `[documento: ${m.filename}]`;
  }
}
