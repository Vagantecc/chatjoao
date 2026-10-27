import { z } from "zod";
import { formatBRL } from "../time";
import { defineTool, ToolInputError } from "./types";

export const VALOR_POR_CUPOM = 300;

/**
 * cupons = floor((valor_normal + 2 × valor_dia_T) / 300), com valor_normal = total − Dia T.
 * Ex.: R$ 950 com R$ 300 no Dia T → (650 + 600) / 300 = 4.
 */
export function calcularCupons(valorTotal: number, valorDiaT = 0) {
  if (!Number.isFinite(valorTotal) || valorTotal < 0) throw new RangeError("valor_total inválido");
  if (!Number.isFinite(valorDiaT) || valorDiaT < 0) throw new RangeError("valor_dia_t inválido");
  if (valorDiaT > valorTotal) throw new RangeError("valor_dia_t não pode ser maior que valor_total");
  // Trabalha em centavos para não errar por ponto flutuante (ex.: 0,1 + 0,2).
  const totalC = Math.round(valorTotal * 100);
  const diaTC = Math.round(valorDiaT * 100);
  const normalC = totalC - diaTC;
  const pontosC = normalC + 2 * diaTC;
  const cupons = Math.floor(pontosC / (VALOR_POR_CUPOM * 100));
  const sobraC = pontosC - cupons * VALOR_POR_CUPOM * 100;
  return {
    cupons,
    valor_normal: normalC / 100,
    valor_dia_t: diaTC / 100,
    valor_considerado: pontosC / 100,
    /** Quanto falta (em compras normais) para o próximo cupom. */
    falta_para_proximo: (VALOR_POR_CUPOM * 100 - sobraC) / 100,
  };
}

export const calcularCuponsTool = defineTool({
  name: "calcular_cupons",
  description:
    "Calcula quantos cupons uma compra gera no sorteio da Strada. valor_total é o valor TOTAL da nota (incluindo o que foi Dia T); " +
    "valor_dia_t é a parte da nota em Ofertas do Dia T (conta em dobro). Sempre use esta ferramenta, nunca faça a conta de cabeça.",
  schema: z.object({
    valor_total: z.number().nonnegative().describe("Valor total da nota fiscal, em reais"),
    valor_dia_t: z.number().nonnegative().default(0).describe("Quanto da nota foi em Ofertas do Dia T, em reais"),
  }),
  async run({ valor_total, valor_dia_t }) {
    try {
      const r = calcularCupons(valor_total, valor_dia_t);
      return {
        data: {
          ...r,
          conta: `(${formatBRL(r.valor_normal)} + 2 × ${formatBRL(r.valor_dia_t)}) ÷ ${VALOR_POR_CUPOM} = ${r.cupons} cupom(ns)`,
          lembrete: "O saldo que sobra não acumula para outra nota.",
        },
        summary: `${formatBRL(valor_total)} (Dia T ${formatBRL(valor_dia_t)}) → ${r.cupons} cupom(ns)`,
      };
    } catch (e) {
      throw new ToolInputError((e as Error).message);
    }
  },
});
