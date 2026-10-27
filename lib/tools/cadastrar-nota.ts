import { createHash, randomInt } from "node:crypto";
import { z } from "zod";
import { isValidCpf, maskCpf, normalizeCpf } from "../privacy/cpf";
import { formatBRL, isoDateInSaoPaulo } from "../time";
import { calcularCupons } from "./calcular-cupons";
import { defineTool, ToolInputError } from "./types";

/** Valor fictício da nota, sempre o mesmo para o mesmo número (para a demo ser previsível). */
export function mockNotaFiscal(numeroNf: string): { valor: number; valorDiaT: number } {
  const h = createHash("sha256").update(numeroNf).digest();
  const valor = 180 + (h.readUInt16BE(0) % 1500) + h[2] / 100;
  const valorDiaT = h[3] % 3 === 0 ? Math.round(valor * 0.3 * 100) / 100 : 0;
  return { valor: Math.round(valor * 100) / 100, valorDiaT };
}

export const cadastrarNota = defineTool({
  name: "cadastrar_nota",
  description:
    "Cadastra uma nota fiscal na promoção (SIMULADO) e gera os números da sorte. Peça CPF e número da nota, explicando que " +
    "servem só para registrar os cupons. Se a nota já foi cadastrada, devolve os números existentes.",
  schema: z.object({
    cpf: z.string().describe("CPF do cliente, com ou sem pontuação"),
    numero_nf: z.string().min(3).max(20).describe("Número da nota fiscal"),
  }),
  async run({ cpf, numero_nf }, ctx) {
    if (!isValidCpf(cpf)) throw new ToolInputError("CPF inválido (dígitos verificadores não conferem). Peça para o cliente conferir.");
    const nf = numero_nf.replace(/\D/g, "");
    if (nf.length < 3) throw new ToolInputError("Número da nota inválido: use só os números que aparecem na NF.");
    const cpfDigits = normalizeCpf(cpf);

    const existing = await ctx.store.cuponsByNota(nf);
    if (existing.length) {
      if (existing[0].cpf !== cpfDigits) {
        return { data: { ok: false, motivo: "Esta nota já foi cadastrada em outro CPF. Ofereça um atendente para verificar." }, summary: "nota já usada por outro CPF" };
      }
      return {
        data: { ok: true, ja_cadastrada: true, numeros_da_sorte: existing.map((c) => c.numero_sorte), mes_sorteio: existing[0].mes_sorteio },
        summary: `nota ${nf} já cadastrada (${existing.length} cupom(ns))`,
      };
    }

    const { valor, valorDiaT } = mockNotaFiscal(nf);
    const { cupons } = calcularCupons(valor, valorDiaT);
    const mes = isoDateInSaoPaulo(ctx.now).slice(0, 7);
    if (cupons === 0) {
      return {
        data: { ok: true, valor_nota: formatBRL(valor), cupons: 0, aviso: "A nota não chegou a R$ 300, então não gerou cupom. O saldo não acumula." },
        summary: `nota ${nf}: ${formatBRL(valor)} → 0 cupom`,
      };
    }

    const numeros: string[] = [];
    while (numeros.length < cupons) {
      const n = String(randomInt(0, 1_000_000)).padStart(6, "0");
      if (!numeros.includes(n) && !(await ctx.store.cupomNumberTaken(mes, n))) numeros.push(n);
    }
    await ctx.store.addCupons(
      numeros.map((numero_sorte) => ({
        numero_sorte,
        cpf: cpfDigits,
        numero_nf: nf,
        valor_nf: valor,
        valor_dia_t: valorDiaT,
        mes_sorteio: mes,
        conversation_id: ctx.conversation.id,
      })),
    );
    const [ano, m] = mes.split("-");
    return {
      data: {
        ok: true,
        simulado: true,
        cpf: maskCpf(cpfDigits),
        valor_nota: formatBRL(valor),
        ...(valorDiaT ? { valor_dia_t: formatBRL(valorDiaT) } : {}),
        cupons,
        numeros_da_sorte: numeros,
        sorteio: `${m}/${ano}, pela Loteria Federal do último sábado do mês`,
      },
      summary: `nota ${nf}: ${formatBRL(valor)} → ${cupons} cupom(ns) ${numeros.join(", ")}`,
    };
  },
});
