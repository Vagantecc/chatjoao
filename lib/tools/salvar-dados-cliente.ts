import { z } from "zod";
import { normalizeCep } from "../geo/geocode";
import { defineTool } from "./types";

export const salvarDadosCliente = defineTool({
  name: "salvar_dados_cliente",
  description:
    "Guarda o nome, a cidade ou o CEP que o cliente informou, para não perguntar de novo nas próximas conversas. " +
    "Use assim que ele disser. Não guarde nenhum outro dado.",
  schema: z.object({
    nome: z.string().max(60).optional().describe("Primeiro nome, como o cliente se apresentou"),
    cidade: z.string().max(60).optional(),
    cep: z.string().optional(),
  }),
  async run({ nome, cidade, cep }, ctx) {
    const saved: string[] = [];
    if (nome?.trim()) {
      ctx.patch.customer_name = nome.trim();
      saved.push("nome");
    }
    if (cidade?.trim()) {
      ctx.patch.city = cidade.trim();
      saved.push("cidade");
    }
    const c = cep ? normalizeCep(cep) : null;
    if (c) {
      ctx.patch.cep = c;
      saved.push("cep");
    }
    return { data: { ok: true, salvo: saved }, summary: saved.length ? `salvou ${saved.join(", ")}` : "nada para salvar" };
  },
});
