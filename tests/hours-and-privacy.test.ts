import { describe, expect, it } from "vitest";
import { seedHolidays, seedStores } from "@/lib/data/seed";
import type { StoreRow } from "@/lib/data/types";
import { isValidCpf, maskCpf } from "@/lib/privacy/cpf";
import { maskSensitive } from "@/lib/privacy/mask";
import { todayHours, weeklySummary } from "@/lib/stores/hours";

const store = (slug: string) => ({ id: 1, ...seedStores.find((s) => s.slug === slug)! }) as StoreRow;
// Horários em UTC; São Paulo = UTC−3.
const at = (iso: string) => new Date(iso);

describe("todayHours", () => {
  it("dia útil normal", () => {
    const h = todayHours(store("gravatai"), at("2026-10-27T13:00:00Z"), seedHolidays); // terça 10h
    expect(h.label).toBe("hoje (terça): 8h às 19h");
    expect(h.openNow).toBe(true);
  });

  it("sábado em São Leopoldo fecha 18h30", () => {
    const h = todayHours(store("sao-leopoldo"), at("2026-10-31T21:45:00Z"), seedHolidays); // sábado 18h45
    expect(h.label).toBe("hoje (sábado): 8h às 18h30");
    expect(h.openNow).toBe(false);
  });

  it("domingo de verão no litoral abre; em junho não", () => {
    expect(todayHours(store("capao-da-canoa"), at("2026-11-01T15:00:00Z"), seedHolidays).label).toBe(
      "hoje (domingo): 9h às 12h e 13h às 17h",
    );
    expect(todayHours(store("capao-da-canoa"), at("2026-06-07T15:00:00Z"), seedHolidays).label).toBe("hoje (domingo): fechada");
  });

  it("feriado usa o horário de feriado, ou pede para confirmar", () => {
    const finados = at("2026-11-02T14:00:00Z");
    expect(todayHours(store("gravatai"), finados, seedHolidays).label).toBe("hoje (feriado: Finados): 9h às 17h");
    expect(todayHours(store("guaiba"), finados, seedHolidays).label).toMatch(/confirme com a loja/);
  });

  it("feriado municipal só vale na cidade", () => {
    const navegantes = at("2027-02-02T14:00:00Z");
    expect(todayHours(store("porto-alegre"), navegantes, seedHolidays).holiday).toBe("Nossa Senhora dos Navegantes");
    expect(todayHours(store("gravatai"), navegantes, seedHolidays).holiday).toBeNull();
  });

  it("loja sem horário cadastrado", () => {
    expect(todayHours(store("porto-alegre"), at("2026-10-27T13:00:00Z"), seedHolidays).label).toMatch(/a confirmar/);
  });

  it("resumo semanal", () => {
    expect(weeklySummary(store("sao-leopoldo"))).toBe("seg a sex 8h às 19h; sáb 8h às 18h30");
  });
});

describe("CPF", () => {
  it("valida dígitos verificadores", () => {
    expect(isValidCpf("123.456.789-09")).toBe(true);
    expect(isValidCpf("12345678900")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(maskCpf("12345678909")).toBe("***.456.789-**");
  });
});

describe("maskSensitive", () => {
  it("oculta número de cartão válido (Luhn) e mantém os 4 últimos", () => {
    const r = maskSensitive("meu cartão é 4111 1111 1111 1111, vence 12/29");
    expect(r.text).toBe("meu cartão é [cartão ocultado •••• 1111], vence 12/29");
    expect(r.found).toContain("cartao");
  });

  it("oculta CVV e senha", () => {
    const r = maskSensitive("o cvv é 123 e a senha: 9876");
    expect(r.text).toBe("o cvv é [ocultado] e a senha: [ocultado]");
    expect(r.found.sort()).toEqual(["cvv", "senha"]);
  });

  it("não mexe em CPF, CEP, telefone nem número de pedido", () => {
    const txt = "CPF 123.456.789-09, CEP 93010-001, fone (51) 99811-1390, pedido 100234";
    expect(maskSensitive(txt)).toEqual({ text: txt, found: [] });
  });
});
