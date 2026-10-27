import { z } from "zod";
import { formatBRL, formatDateBR, isoDateInSaoPaulo } from "../time";
import { defineTool } from "./types";

export const ofertasDiaTHoje = defineTool({
  name: "ofertas_dia_t_hoje",
  description:
    "Lista as Ofertas do Dia T de hoje (produtos que contam em dobro na promoção). Cada oferta volta com id (P1...) para citar em `anexos`.",
  schema: z.object({}),
  async run(_input, ctx) {
    const today = isoDateInSaoPaulo(ctx.now);
    let ofertas = await ctx.store.ofertasDiaT(today);
    let data = today;
    if (ofertas.length === 0) {
      const next = await ctx.store.nextOfertasDate(today);
      if (next) {
        ofertas = await ctx.store.ofertasDiaT(next);
        data = next;
      }
    }
    if (ofertas.length === 0) {
      return {
        data: { hoje: formatDateBR(today), ofertas: [], aviso: "Sem Ofertas do Dia T cadastradas. Sugira o outlet: https://www.tumelero.com.br/outlet-tumelero" },
        summary: "nenhuma oferta cadastrada",
      };
    }
    const lista = ofertas.map((o) => ({
      id: ctx.attachments.add("P", [
        {
          type: "product",
          product: { name: o.product_name, price: o.price, listPrice: o.normal_price, imageUrl: o.image_url, link: o.link, badge: "Oferta do Dia T" },
        },
      ]),
      produto: o.product_name,
      preco: formatBRL(o.price),
      ...(o.normal_price ? { preco_normal: formatBRL(o.normal_price) } : {}),
    }));
    return {
      data: {
        data: formatDateBR(data),
        e_hoje: data === today,
        ofertas: lista,
        lembrete: "Produtos do Dia T contam em dobro para os cupons da Strada.",
      },
      summary: `${lista.length} oferta(s) em ${formatDateBR(data)}${data === today ? " (hoje)" : " (próxima data)"}`,
    };
  },
});
