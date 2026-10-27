// Escolhe a implementação de dados: Supabase quando configurado, memória caso contrário.
// Só importe este arquivo em código de servidor (usa a service role key).
import "server-only";
import { MemoryStore } from "./data/memory";
import type { DataStore } from "./data/store";
import { SupabaseStore } from "./data/supabase";

const g = globalThis as unknown as { __joaoStore?: DataStore };

export function getStore(): DataStore {
  if (g.__joaoStore) return g.__joaoStore;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    g.__joaoStore = new SupabaseStore(url, key);
  } else {
    console.warn("[joao] Supabase não configurado: usando dados em memória (somem ao reiniciar).");
    g.__joaoStore = new MemoryStore();
  }
  return g.__joaoStore;
}
