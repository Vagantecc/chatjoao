// Transforma as definições do seed (com datas relativas) em linhas prontas,
// tomando `now` como referência. Usado pelo modo memória e pelos testes.
import {
  seedCardHolders,
  seedHolidays,
  seedOfertasDiaT,
  seedOrders,
  seedProducts,
  seedPromoRules,
  seedStores,
} from "./seed";
import type {
  HolidayRow,
  MockCardHolderRow,
  MockOrderRow,
  OfertaDiaTRow,
  ProductRow,
  PromoRuleRow,
  StoreRow,
} from "./types";
import { isoDateInSaoPaulo } from "../time";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export interface SeedTables {
  stores: StoreRow[];
  holidays: HolidayRow[];
  products: ProductRow[];
  promo_rules: PromoRuleRow[];
  ofertas_dia_t: OfertaDiaTRow[];
  mock_orders: MockOrderRow[];
  mock_card_holders: MockCardHolderRow[];
}

export function materializeSeed(now: Date = new Date()): SeedTables {
  const t = now.getTime();
  const day = (offset: number) => isoDateInSaoPaulo(new Date(t + offset * DAY));

  return {
    stores: seedStores.map((s, i) => ({ id: i + 1, ...structuredClone(s) })),
    holidays: seedHolidays.map((h) => ({ ...h })),
    products: seedProducts.map((p, i) => ({ id: i + 1, ...structuredClone(p) })),
    promo_rules: seedPromoRules.map((r, i) => ({ id: i + 1, ...structuredClone(r) })),
    ofertas_dia_t: seedOfertasDiaT.map(({ dayOffset, ...o }, i) => ({ id: i + 1, ...o, date: day(dayOffset) })),
    mock_orders: seedOrders.map(({ steps, etaDays, ...o }, i) => ({
      id: i + 1,
      ...structuredClone(o),
      timeline: steps.map(([status, hoursAgo]) => ({ status, at: new Date(t - hoursAgo * HOUR).toISOString() })),
      eta: etaDays === null ? null : day(etaDays),
      created_at: new Date(t - steps[0][1] * HOUR).toISOString(),
    })),
    mock_card_holders: seedCardHolders.map((c, i) => ({
      id: i + 1,
      cpf: c.cpf,
      birth_date: c.birth_date,
      name: c.name,
      last4: c.last4,
      limit_total: c.limit_total,
      limit_available: c.limit_available,
      invoice: {
        amount: c.invoice.amount,
        due_date: day(c.invoice.dueInDays),
        closing_date: day(-c.invoice.closedDaysAgo),
        status: c.invoice.status,
      },
      open_debts: c.open_debts.map((d) => ({ description: d.description, amount: d.amount, due_date: day(d.dueInDays) })),
      recent_purchases: c.recent_purchases.map((p) => ({
        date: day(-p.daysAgo),
        description: p.description,
        amount: p.amount,
        ...(p.installments ? { installments: p.installments } : {}),
      })),
    })),
  };
}
