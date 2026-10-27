import { readFileSync } from "node:fs";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { MemoryStore } from "@/lib/data/memory";
import type { Geocoder, GeoPoint } from "@/lib/geo/geocode";
import type { BrainDeps } from "@/lib/joao-brain";
import type { LlmRequest, LlmResponse } from "@/lib/llm";
import { MockCardProvider } from "@/lib/providers/card";
import { MockOrderProvider } from "@/lib/providers/order";
import { parseVtexProducts, type Catalog } from "@/lib/vtex/catalog";

export const NOW = new Date("2026-10-27T17:30:00Z"); // terça, 14h30 em Porto Alegre

let seq = 0;
export function toolUse(name: string, input: unknown): Anthropic.Beta.BetaToolUseBlock {
  return { type: "tool_use", id: `toolu_${++seq}`, name, input } as Anthropic.Beta.BetaToolUseBlock;
}

export function turn(...blocks: Anthropic.Beta.BetaContentBlock[]): LlmResponse {
  return { content: blocks, stop_reason: blocks.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn" };
}

/** Lê o conteúdo JSON do tool_result de uma ferramenta, a partir da última requisição. */
export function toolResultFor(req: LlmRequest, name: string): Record<string, unknown> | undefined {
  const msgs = req.messages;
  const assistant = msgs.at(-2);
  const user = msgs.at(-1);
  if (!assistant || !user || !Array.isArray(assistant.content) || !Array.isArray(user.content)) return undefined;
  const use = (assistant.content as { type: string; name?: string; id?: string }[]).find((b) => b.type === "tool_use" && b.name === name);
  const res = (user.content as { type: string; tool_use_id?: string; content?: unknown }[]).find(
    (b) => b.type === "tool_result" && b.tool_use_id === use?.id,
  );
  return res && typeof res.content === "string" && res.content.startsWith("{") ? JSON.parse(res.content) : undefined;
}

/**
 * LLM roteirizado: cada passo recebe a requisição e devolve a resposta.
 * Guarda as requisições para os testes inspecionarem.
 */
export function scriptedLlm(steps: ((req: LlmRequest) => LlmResponse)[]) {
  const requests: LlmRequest[] = [];
  let i = 0;
  const llm = async (req: LlmRequest) => {
    requests.push(structuredClone(req));
    const step = steps[i++];
    if (!step) throw new Error(`LLM roteirizado sem passo ${i}`);
    return step(req);
  };
  return { llm, requests };
}

const fixture = JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures", "vtex-search.json"), "utf8"));

export const vtexDown: Catalog = {
  async search() {
    throw new Error("timeout");
  },
};

export const vtexFromFixture: Catalog = {
  async search(term) {
    return /manta|imperme/i.test(term) ? parseVtexProducts(fixture) : [];
  },
};

const PLACES: Record<string, GeoPoint> = {
  "93010001": { lat: -29.76028, lng: -51.14722, label: "Rua Independência, Centro, São Leopoldo/RS", city: "São Leopoldo", source: "brasilapi" },
  "novo hamburgo": { lat: -29.6905705, lng: -51.1429035, label: "Novo Hamburgo, Rio Grande do Sul", city: "Novo Hamburgo", source: "nominatim" },
};

export const fakeGeocoder: Geocoder = {
  async byCep(cep) {
    return PLACES[cep.replace(/\D/g, "")] ?? null;
  },
  async byText(q) {
    return PLACES[q.trim().toLowerCase()] ?? null;
  },
};

export function makeDeps(llm: BrainDeps["llm"], catalog: Catalog = vtexDown): BrainDeps & { store: MemoryStore } {
  const store = new MemoryStore(NOW);
  return {
    store,
    catalog,
    geocoder: fakeGeocoder,
    orders: new MockOrderProvider(store),
    cards: new MockCardProvider(store, "https://joao.test"),
    llm,
    now: () => NOW,
  };
}
