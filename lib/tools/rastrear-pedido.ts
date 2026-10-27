import { z } from "zod";
import { isValidCpf, normalizeCpf } from "../privacy/cpf";
import { ORDER_STATUS_LABEL, type Order } from "../providers/order";
import { formatBRL, formatDateBR, formatDateTimeBR, isoDateInSaoPaulo } from "../time";
import { defineTool, ToolInputError } from "./types";

function describe(o: Order, today: string) {
  const etaTxt =
    o.status === "entregue"
      ? "já entregue"
      : o.deliveryType === "retirada"
        ? `retirada na loja ${o.storeSlug ?? ""}`.trim()
        : o.eta
          ? o.eta === today
            ? "hoje"
            : formatDateBR(o.eta)
          : "sem previsão";
  return {
    pedido: o.number,
    cliente: o.customerFirstName,
    status_atual: ORDER_STATUS_LABEL[o.status],
    atrasado: o.status === "atrasado",
    tipo: o.deliveryType,
    previsao: etaTxt,
    linha_do_tempo: o.timeline.map((t) => `${formatDateTimeBR(t.at)} — ${ORDER_STATUS_LABEL[t.status]}`),
    itens: o.items.map((i) => `${i.qty}× ${i.name}`),
    total: formatBRL(o.total),
  };
}

export const rastrearPedido = defineTool({
  name: "rastrear_pedido",
  description:
    "Consulta o status de um pedido (SIMULADO) pelo número do pedido ou pelo CPF do comprador. " +
    "Mostre uma linha do tempo curta (•) e a previsão. Se estiver atrasado, peça desculpas com sinceridade e ofereça um atendente.",
  schema: z.object({
    numero_pedido: z.string().optional().describe("Número do pedido, só dígitos"),
    cpf: z.string().optional().describe("CPF do comprador, se o cliente não souber o número"),
  }),
  async run({ numero_pedido, cpf }, ctx) {
    const today = isoDateInSaoPaulo(ctx.now);
    if (numero_pedido) {
      const o = await ctx.orders.findByNumber(numero_pedido);
      if (!o) {
        return {
          data: { encontrado: false, aviso: "Pedido não encontrado. Peça para conferir o número (está no e-mail de confirmação) ou o CPF." },
          summary: `pedido ${numero_pedido} não encontrado`,
        };
      }
      return { data: { encontrado: true, ...describe(o, today) }, summary: `pedido ${o.number}: ${ORDER_STATUS_LABEL[o.status]}` };
    }
    if (cpf) {
      if (!isValidCpf(cpf)) throw new ToolInputError("CPF inválido. Peça para o cliente conferir.");
      const list = await ctx.orders.findByCpf(normalizeCpf(cpf));
      if (!list.length) return { data: { encontrado: false, aviso: "Nenhum pedido nesse CPF." }, summary: "nenhum pedido no CPF" };
      return {
        data: { encontrado: true, pedidos: list.slice(0, 3).map((o) => describe(o, today)) },
        summary: `${list.length} pedido(s) no CPF: ${list.map((o) => `${o.number} ${ORDER_STATUS_LABEL[o.status]}`).join(", ")}`,
      };
    }
    throw new ToolInputError("Informe numero_pedido ou cpf.");
  },
});
