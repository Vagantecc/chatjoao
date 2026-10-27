import { z } from "zod";
import type { DataStore } from "../data/store";
import type { ConversationRow } from "../data/types";
import type { Geocoder } from "../geo/geocode";
import type { OutMessage } from "../messages";
import type { CardProvider } from "../providers/card";
import type { OrderProvider } from "../providers/order";
import type { Catalog } from "../vtex/catalog";

/**
 * Anexos que as ferramentas preparam (cards de produto, loja, boleto, Pix).
 * O modelo só cita o id (ex.: "P1") na resposta; o conteúdo vem do dado real,
 * então preço, link e endereço nunca passam pela "imaginação" do modelo.
 */
export class Attachments {
  private items = new Map<string, OutMessage[]>();
  private counters = new Map<string, number>();

  add(prefix: string, messages: OutMessage[]): string {
    const n = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, n);
    const id = `${prefix}${n}`;
    this.items.set(id, messages);
    return id;
  }

  get(id: string): OutMessage[] | undefined {
    return this.items.get(id.trim().toUpperCase());
  }

  has(id: string): boolean {
    return this.items.has(id.trim().toUpperCase());
  }
}

export interface ToolContext {
  store: DataStore;
  catalog: Catalog;
  geocoder: Geocoder;
  orders: OrderProvider;
  cards: CardProvider;
  conversation: ConversationRow;
  now: Date;
  attachments: Attachments;
  /** Alterações na conversa que o motor grava no fim do turno (nome, cidade, status...). */
  patch: Partial<ConversationRow>;
}

export interface ToolResult {
  /** O que o modelo lê. Objeto simples, serializado como JSON. */
  data: unknown;
  /** Uma linha para o painel do modo demo. */
  summary: string;
}

export interface ToolDef<S extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: S;
  run(input: z.infer<S>, ctx: ToolContext): Promise<ToolResult>;
}

export function defineTool<S extends z.ZodType>(def: ToolDef<S>): ToolDef<S> {
  return def;
}

/** JSON Schema da ferramenta no formato que a API da Anthropic espera. */
export function toInputSchema(schema: z.ZodType): { type: "object"; [k: string]: unknown } {
  const json = z.toJSONSchema(schema, { target: "draft-2020-12" }) as Record<string, unknown>;
  delete json.$schema;
  return { ...json, type: "object" };
}

/** Erro que vira tool_result com is_error, para o modelo corrigir e tentar de novo. */
export class ToolInputError extends Error {}
