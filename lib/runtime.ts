// Monta as dependências do motor para as rotas (singleton por instância do servidor).
import "server-only";
import { getStore } from "./db";
import { createGeocoder } from "./geo/geocode";
import type { BrainDeps } from "./joao-brain";
import { createFakeLlm } from "./dev/fake-llm";
import { createAnthropicLlm } from "./llm";
import { MockCardProvider } from "./providers/card";
import { MockOrderProvider } from "./providers/order";
import { createVtexCatalog } from "./vtex/catalog";

const g = globalThis as unknown as { __joaoShared?: Omit<BrainDeps, "cards"> };

/** URL pública do app, usada em links que saem para o cliente (ex.: PDF do boleto). */
export function publicAppUrl(req?: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return req ? new URL(req.url).origin : "http://localhost:3000";
}

export function getBrainDeps(appUrl: string): BrainDeps {
  if (!g.__joaoShared) {
    const store = getStore();
    g.__joaoShared = {
      store,
      catalog: createVtexCatalog(),
      geocoder: createGeocoder({ cache: { get: (k) => store.geoCacheGet(k), set: (k, v) => store.geoCacheSet(k, v) } }),
      orders: new MockOrderProvider(store),
      llm: fakeLlmEnabled() ? createFakeLlm() : createAnthropicLlm(),
    };
  }
  return { ...g.__joaoShared, cards: new MockCardProvider(g.__joaoShared.store, appUrl) };
}

/** LLM de ensaio por regras, só em desenvolvimento (ver lib/dev/fake-llm.ts). */
function fakeLlmEnabled(): boolean {
  return process.env.JOAO_FAKE_LLM === "1" && process.env.NODE_ENV !== "production";
}

export function llmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) || fakeLlmEnabled();
}
