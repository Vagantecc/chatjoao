// Gera /supabase/seed.sql a partir de lib/data/seed.ts.
// Datas relativas (pedidos, faturas, Dia T) viram expressões SQL, então o seed
// fica "fresco" sempre que roda.  Uso: npx tsx scripts/gen-seed.ts
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  seedCardHolders,
  seedHolidays,
  seedOfertasDiaT,
  seedOrders,
  seedProducts,
  seedPromoRules,
  seedStores,
} from "../lib/data/seed";

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return `'${String(v).replace(/'/g, "''")}'`;
};
const arr = (xs: string[]) => `array[${xs.map(q).join(", ")}]::text[]`;
const json = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const day = (offset: number) => `(current_date + ${offset})`;
const hoursAgo = (h: number) => `(now() - interval '${h} hours')`;

const out: string[] = [
  "-- Gerado por scripts/gen-seed.ts — não edite à mão.",
  "-- Dados de demonstração do João da Obra (pedidos, cartões e regulamento são fictícios).",
  "",
  "truncate stores, holidays, products, promo_rules, ofertas_dia_t, mock_orders, mock_card_holders restart identity cascade;",
  "",
];

out.push("insert into stores (slug, name, address, neighborhood, city, cep, lat, lng, whatsapp, phone, hours, active) values");
out.push(
  seedStores
    .map(
      (s) =>
        `  (${q(s.slug)}, ${q(s.name)}, ${q(s.address)}, ${q(s.neighborhood)}, ${q(s.city)}, ${q(s.cep)}, ${s.lat}, ${s.lng}, ${arr(s.whatsapp)}, ${q(s.phone)}, ${s.hours ? json(s.hours) : "null"}, ${q(s.active)})`,
    )
    .join(",\n") + ";",
  "",
);

out.push("insert into holidays (date, name, scope, city) values");
out.push(seedHolidays.map((h) => `  (${q(h.date)}, ${q(h.name)}, ${q(h.scope)}, ${q(h.city)})`).join(",\n") + ";", "");

out.push("insert into products (name, category, subcategory, brand, price, link, image_url, keywords, active) values");
out.push(
  seedProducts
    .map(
      (p) =>
        `  (${q(p.name)}, ${q(p.category)}, ${q(p.subcategory)}, ${q(p.brand)}, ${p.price}, ${q(p.link)}, ${q(p.image_url)}, ${arr(p.keywords)}, ${q(p.active)})`,
    )
    .join(",\n") + ";",
  "",
);

out.push("insert into promo_rules (slug, title, content, keywords, sort_order) values");
out.push(
  seedPromoRules.map((r) => `  (${q(r.slug)}, ${q(r.title)}, ${q(r.content)}, ${arr(r.keywords)}, ${r.sort_order})`).join(",\n") + ";",
  "",
);

out.push("insert into ofertas_dia_t (product_name, price, normal_price, link, image_url, date) values");
out.push(
  seedOfertasDiaT
    .map((o) => `  (${q(o.product_name)}, ${o.price}, ${q(o.normal_price)}, ${q(o.link)}, ${q(o.image_url)}, ${day(o.dayOffset)})`)
    .join(",\n") + ";",
  "",
);

out.push(
  "insert into mock_orders (order_number, cpf, customer_name, status, delivery_type, store_slug, items, total, timeline, eta, created_at) values",
);
out.push(
  seedOrders
    .map((o) => {
      const timeline = `jsonb_build_array(${o.steps
        .map(([status, h]) => `jsonb_build_object('status', ${q(status)}, 'at', ${hoursAgo(h)})`)
        .join(", ")})`;
      return `  (${q(o.order_number)}, ${q(o.cpf)}, ${q(o.customer_name)}, ${q(o.status)}, ${q(o.delivery_type)}, ${q(o.store_slug)}, ${json(o.items)}, ${o.total}, ${timeline}, ${o.etaDays === null ? "null" : day(o.etaDays)}, ${hoursAgo(o.steps[0][1])})`;
    })
    .join(",\n") + ";",
  "",
);

out.push(
  "insert into mock_card_holders (cpf, birth_date, name, last4, limit_total, limit_available, invoice, open_debts, recent_purchases) values",
);
out.push(
  seedCardHolders
    .map((c) => {
      const invoice = `jsonb_build_object('amount', ${c.invoice.amount}, 'due_date', ${day(c.invoice.dueInDays)}, 'closing_date', ${day(-c.invoice.closedDaysAgo)}, 'status', ${q(c.invoice.status)})`;
      const debts = `jsonb_build_array(${c.open_debts
        .map((d) => `jsonb_build_object('description', ${q(d.description)}, 'amount', ${d.amount}, 'due_date', ${day(d.dueInDays)})`)
        .join(", ")})`;
      const purchases = `jsonb_build_array(${c.recent_purchases
        .map(
          (p) =>
            `jsonb_build_object('date', ${day(-p.daysAgo)}, 'description', ${q(p.description)}, 'amount', ${p.amount}${p.installments ? `, 'installments', ${q(p.installments)}` : ""})`,
        )
        .join(", ")})`;
      return `  (${q(c.cpf)}, ${q(c.birth_date)}, ${q(c.name)}, ${q(c.last4)}, ${c.limit_total}, ${c.limit_available}, ${invoice}, ${debts}, ${purchases})`;
    })
    .join(",\n") + ";",
  "",
);

const target = path.join(import.meta.dirname, "..", "supabase", "seed.sql");
writeFileSync(target, out.join("\n"));
console.log(`seed.sql gerado: ${target}`);
