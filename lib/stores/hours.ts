// Horário de hoje de cada loja, considerando dia da semana, sazonalidade e feriados.
import type { HolidayRow, StoreRow, TimeRange } from "../data/types";
import { localParts, WEEKDAY_PT } from "../time";

export interface TodayHours {
  /** "hoje (terça): 8h às 19h" */
  label: string;
  ranges: TimeRange[] | null; // null = desconhecido
  openNow: boolean | null;
  holiday: string | null;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** "08:00" → "8h", "18:30" → "18h30" */
export function fmtHour(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

export function fmtRanges(ranges: TimeRange[]): string {
  return ranges.map(([a, b]) => `${fmtHour(a)} às ${fmtHour(b)}`).join(" e ");
}

export function holidayFor(store: Pick<StoreRow, "city">, date: string, holidays: HolidayRow[]): HolidayRow | null {
  return holidays.find((h) => h.date === date && (h.scope !== "municipal" || h.city === store.city)) ?? null;
}

export function todayHours(store: Pick<StoreRow, "city" | "hours">, now: Date, holidays: HolidayRow[]): TodayHours {
  const p = localParts(now);
  const dayName = WEEKDAY_PT[p.weekday];
  const holiday = holidayFor(store, p.date, holidays);
  const prefix = holiday ? `hoje (feriado: ${holiday.name})` : `hoje (${dayName})`;

  if (!store.hours) {
    return { label: `${prefix}: horário a confirmar com a loja`, ranges: null, openNow: null, holiday: holiday?.name ?? null };
  }

  let ranges: TimeRange[] | undefined;
  if (holiday) {
    ranges = store.hours.holiday;
    if (ranges === undefined) {
      return {
        label: `${prefix}: confirme com a loja se abre no feriado`,
        ranges: null,
        openNow: null,
        holiday: holiday.name,
      };
    }
  } else {
    const seasonal = store.hours.seasonal?.find((s) => s.day === p.weekday && s.months.includes(p.month));
    ranges = seasonal ? seasonal.ranges : (store.hours.week[p.weekday] ?? []);
  }

  if (ranges.length === 0) {
    return { label: `${prefix}: fechada`, ranges, openNow: false, holiday: holiday?.name ?? null };
  }
  const openNow = ranges.some(([a, b]) => p.minutes >= toMin(a) && p.minutes < toMin(b));
  return { label: `${prefix}: ${fmtRanges(ranges)}`, ranges, openNow, holiday: holiday?.name ?? null };
}

/** Resumo semanal para mostrar ao cliente, ex.: "seg a sáb 8h às 19h". */
export function weeklySummary(store: Pick<StoreRow, "hours">): string {
  const h = store.hours;
  if (!h) return "horário a confirmar";
  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const short: Record<(typeof order)[number], string> = { mon: "seg", tue: "ter", wed: "qua", thu: "qui", fri: "sex", sat: "sáb", sun: "dom" };
  const groups: { from: string; to: string; text: string }[] = [];
  for (const d of order) {
    const r = h.week[d] ?? [];
    const text = r.length ? fmtRanges(r) : "";
    const last = groups.at(-1);
    if (last && last.text === text) last.to = short[d];
    else groups.push({ from: short[d], to: short[d], text });
  }
  const parts = groups.filter((g) => g.text).map((g) => `${g.from === g.to ? g.from : `${g.from} a ${g.to}`} ${g.text}`);
  for (const s of h.seasonal ?? []) parts.push(`${short[s.day]} (meses ${s.months.join(", ")}) ${fmtRanges(s.ranges)}`);
  if (h.holiday?.length) parts.push(`feriados ${fmtRanges(h.holiday)}`);
  return parts.join("; ");
}
