import { describe, expect, it } from "vitest";
import { calcularCupons, calcularCuponsTool } from "@/lib/tools/calcular-cupons";
import type { ToolContext } from "@/lib/tools/types";

describe("calcularCupons", () => {
  it("exemplo do regulamento: R$ 950 com R$ 300 no Dia T dá 4 cupons", () => {
    const r = calcularCupons(950, 300);
    expect(r.cupons).toBe(4);
    expect(r.valor_normal).toBe(650);
    expect(r.valor_considerado).toBe(1250);
    expect(r.falta_para_proximo).toBe(250); // sobram 50, faltam 250
  });

  it("sem Dia T: 1 cupom a cada R$ 300", () => {
    expect(calcularCupons(299.99).cupons).toBe(0);
    expect(calcularCupons(300).cupons).toBe(1);
    expect(calcularCupons(899.99).cupons).toBe(2);
    expect(calcularCupons(900).cupons).toBe(3);
  });

  it("Dia T conta em dobro", () => {
    expect(calcularCupons(150, 150).cupons).toBe(1);
    expect(calcularCupons(300, 300).cupons).toBe(2);
  });

  it("não sofre com ponto flutuante", () => {
    // 0.1 + 0.2 !== 0.3 em float; em centavos fecha certinho.
    expect(calcularCupons(600.3, 0.3).cupons).toBe(2);
    expect(calcularCupons(299.7, 0.3).valor_considerado).toBe(300);
    expect(calcularCupons(299.7, 0.3).cupons).toBe(1);
  });

  it("rejeita valores incoerentes", () => {
    expect(() => calcularCupons(-1)).toThrow();
    expect(() => calcularCupons(100, 200)).toThrow(/maior/);
    expect(() => calcularCupons(Number.NaN)).toThrow();
  });

  it("a ferramenta valida a entrada com Zod e devolve a conta explicada", async () => {
    const input = calcularCuponsTool.schema.parse({ valor_total: 950, valor_dia_t: 300 });
    const out = await calcularCuponsTool.run(input, {} as ToolContext);
    expect(out.data).toMatchObject({ cupons: 4 });
    expect(String((out.data as { conta: string }).conta)).toContain("= 4");
    expect(calcularCuponsTool.schema.safeParse({ valor_total: "950" }).success).toBe(false);
    expect(calcularCuponsTool.schema.parse({ valor_total: 300 }).valor_dia_t).toBe(0);
  });
});
