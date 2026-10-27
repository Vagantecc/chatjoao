// Valida migrations + seed num Postgres em WASM (PGlite), sem precisar do Supabase CLI.
// Uso: npm run db:check
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const root = path.join(import.meta.dirname, "..", "supabase");
const db = new PGlite();

const migrations = readdirSync(path.join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort();
for (const file of migrations) {
  await db.exec(readFileSync(path.join(root, "migrations", file), "utf8"));
  console.log(`✓ migration ${file}`);
}
await db.exec(readFileSync(path.join(root, "seed.sql"), "utf8"));
console.log("✓ seed.sql");

for (const table of ["stores", "holidays", "products", "promo_rules", "ofertas_dia_t", "mock_orders", "mock_card_holders"]) {
  const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from ${table}`);
  console.log(`  ${table.padEnd(18)} ${rows[0].n}`);
}
const hoje = await db.query<{ n: number }>("select count(*)::int as n from ofertas_dia_t where date = current_date");
console.log(`  ofertas de hoje     ${hoje.rows[0].n}`);
await db.close();
