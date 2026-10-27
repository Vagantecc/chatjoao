import { z } from "zod";
import { isValidCpf, normalizeCpf } from "../privacy/cpf";
import { amountDue } from "../providers/card";
import { formatBRL, formatDateBR, isoDateInSaoPaulo } from "../time";
import { defineTool, ToolInputError } from "./types";

const MAX_VERIFY_FAILURES = 3;

export const consultarCartaoTumelero = defineTool({
  name: "consultar_cartao_tumelero",
  description:
    "Consulta o Cartão Tumelero (SIMULADO). Exige CPF + data de nascimento do titular para confirmar a identidade. " +
    "Ações: resumo (fatura, limite e débitos), fatura, debitos, limite, compras, boleto (2ª via em PDF), pix (copia-e-cola). " +
    "NUNCA peça senha, CVV ou número do cartão. Boleto e Pix voltam com id (D1...) para citar em `anexos`.",
  schema: z.object({
    cpf: z.string().describe("CPF do titular"),
    data_nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Data de nascimento no formato AAAA-MM-DD"),
    acao: z.enum(["resumo", "fatura", "debitos", "limite", "compras", "boleto", "pix"]),
  }),
  async run({ cpf, data_nascimento, acao }, ctx) {
    const failures = ctx.patch.card_verify_failures ?? ctx.conversation.card_verify_failures;
    if (failures >= MAX_VERIFY_FAILURES) {
      return {
        data: { verificado: false, bloqueado: true, aviso: "Muitas tentativas sem sucesso. Por segurança, encaminhe para um atendente (falar_com_humano)." },
        summary: "bloqueado por tentativas",
      };
    }
    if (!isValidCpf(cpf)) throw new ToolInputError("CPF inválido. Peça para o cliente conferir.");

    const digits = normalizeCpf(cpf);
    const account = await ctx.cards.verify(digits, data_nascimento);
    if (!account) {
      ctx.patch.card_verify_failures = failures + 1;
      return {
        data: {
          verificado: false,
          tentativas_restantes: MAX_VERIFY_FAILURES - failures - 1,
          aviso: "CPF e data de nascimento não conferem com um titular. Peça para conferir, sem dizer qual dos dois está errado.",
        },
        summary: "verificação falhou",
      };
    }
    if (failures) ctx.patch.card_verify_failures = 0;

    const today = isoDateInSaoPaulo(ctx.now);
    const base = { verificado: true, titular: account.holderFirstName, cartao_final: account.last4, simulado: true };
    const fatura = {
      valor: formatBRL(account.invoice.amount),
      vencimento: formatDateBR(account.invoice.dueDate),
      vencida: account.invoice.dueDate < today && account.invoice.status !== "paga",
      situacao: account.invoice.status,
    };
    const limite = { disponivel: formatBRL(account.limitAvailable), total: formatBRL(account.limitTotal) };
    const debitos = account.openDebts.map((d) => ({
      descricao: d.description,
      valor: formatBRL(d.amount),
      vencimento: formatDateBR(d.dueDate),
      vencido: d.dueDate < today,
    }));
    const compras = account.recentPurchases.map((p) => ({
      data: formatDateBR(p.date),
      descricao: p.description,
      valor: formatBRL(p.amount),
      ...(p.installments ? { parcela: p.installments } : {}),
    }));

    switch (acao) {
      case "resumo":
        return { data: { ...base, fatura, limite, debitos }, summary: `resumo do cartão final ${account.last4}` };
      case "fatura":
        return { data: { ...base, fatura }, summary: `fatura ${fatura.valor} vence ${fatura.vencimento}` };
      case "debitos":
        return { data: { ...base, debitos, total_a_pagar: formatBRL(amountDue(account)) }, summary: `${debitos.length} débito(s)` };
      case "limite":
        return { data: { ...base, limite }, summary: `limite disponível ${limite.disponivel}` };
      case "compras":
        return { data: { ...base, compras }, summary: `${compras.length} compra(s) recente(s)` };
      case "boleto": {
        const b = await ctx.cards.boleto(digits, account);
        const id = ctx.attachments.add("D", [
          { type: "document", url: b.pdfUrl, filename: b.filename, caption: `2ª via — Cartão Tumelero final ${account.last4}` },
          { type: "text", text: `Linha digitável (fictícia, só demonstração):\n${b.linhaDigitavel}` },
        ]);
        return {
          data: { ...base, id, valor: formatBRL(b.amount), vencimento: formatDateBR(b.dueDate), dica: `Cite ${id} em anexos: vai o PDF e a linha digitável.` },
          summary: `boleto ${formatBRL(b.amount)} gerado`,
        };
      }
      case "pix": {
        const p = await ctx.cards.pix(digits, account);
        const id = ctx.attachments.add("D", [{ type: "text", text: p.copiaECola }]);
        return {
          data: { ...base, id, valor: formatBRL(p.amount), dica: `Cite ${id} em anexos: vai o código Pix sozinho num balão, fácil de copiar. Avise que é fictício.` },
          summary: `pix ${formatBRL(p.amount)} gerado`,
        };
      }
    }
  },
});
