// Datas e horas sempre no fuso das lojas (America/Sao_Paulo), independente do servidor.
import type { WeekdayKey } from "./data/types";

export const TZ = "America/Sao_Paulo";

const WEEKDAYS: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const WEEKDAY_PT: Record<WeekdayKey, string> = {
  sun: "domingo",
  mon: "segunda",
  tue: "terça",
  wed: "quarta",
  thu: "quinta",
  fri: "sexta",
  sat: "sábado",
};

export interface LocalParts {
  date: string; // YYYY-MM-DD
  month: number; // 1-12
  weekday: WeekdayKey;
  minutes: number; // minutos desde 00:00
}

export function localParts(now: Date): LocalParts {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const weekday = WEEKDAYS[["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday)];
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    month: Number(parts.month),
    weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function isoDateInSaoPaulo(d: Date): string {
  return localParts(d).date;
}

/** "27/10/2026" */
export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** "27/10 às 14h30" */
export function formatDateTimeBR(iso: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: TZ,
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.day}/${p.month} às ${p.hour}h${p.minute}`;
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
