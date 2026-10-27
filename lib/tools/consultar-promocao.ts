import { z } from "zod";
import { fold } from "../data/store";
import { defineTool } from "./types";

export const consultarPromocao = defineTool({
  name: "consultar_promocao",
  description:
    "Devolve os trechos do regulamento da Promoção Tumelero 60 Anos (sorteio da Fiat Strada) que respondem à dúvida. " +
    "Responda SOMENTE com base nesses trechos. Se não estiver lá, diga que vai confirmar e ofereça um atendente.",
  schema: z.object({ pergunta: z.string().min(2).describe("A dúvida do cliente, com as palavras dele") }),
  async run({ pergunta }, ctx) {
    const rules = await ctx.store.promoRules();
    const q = fold(pergunta);
    const scored = rules
      .map((r) => {
        let s = 0;
        for (const k of r.keywords) if (q.includes(fold(k))) s += 2;
        for (const w of q.split(/\W+/).filter((x) => x.length > 3)) if (fold(r.content).includes(w)) s += 1;
        return { r, s };
      })
      .sort((a, b) => b.s - a.s);
    const relevant = scored.filter((x) => x.s > 0).slice(0, 4).map((x) => x.r);
    const aviso = rules.find((r) => r.slug === "aviso");
    const trechos = (relevant.length ? relevant : rules).map((r) => ({ titulo: r.title, texto: r.content }));
    if (aviso && !relevant.includes(aviso)) trechos.push({ titulo: aviso.title, texto: aviso.content });
    return {
      data: { trechos, observacao: "Regulamento salvo no painel. Não acrescente regras que não estão aqui." },
      summary: `${relevant.length || rules.length} trecho(s): ${trechos.map((t) => t.titulo).join(", ")}`,
    };
  },
});
