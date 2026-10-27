import type Anthropic from "@anthropic-ai/sdk";
import { buscarLojaProxima } from "./buscar-loja";
import { buscarProdutos } from "./buscar-produtos";
import { cadastrarNota } from "./cadastrar-nota";
import { calcularCuponsTool } from "./calcular-cupons";
import { consultarCartaoTumelero } from "./cartao-tumelero";
import { consultarPromocao } from "./consultar-promocao";
import { falarComHumano } from "./falar-com-humano";
import { ofertasDiaTHoje } from "./ofertas-dia-t";
import { rastrearPedido } from "./rastrear-pedido";
import { RESPONDER_NAME, responderDescription, responderSchema } from "./responder";
import { salvarDadosCliente } from "./salvar-dados-cliente";
import { toInputSchema, type ToolDef } from "./types";

/** Ordem fixa: a lista de ferramentas faz parte do prefixo em cache. */
export const TOOLS: ToolDef[] = [
  buscarProdutos,
  consultarPromocao,
  calcularCuponsTool,
  ofertasDiaTHoje,
  cadastrarNota,
  buscarLojaProxima,
  rastrearPedido,
  consultarCartaoTumelero,
  falarComHumano,
  salvarDadosCliente,
] as ToolDef[];

export const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

export function anthropicTools(): Anthropic.Beta.BetaTool[] {
  return [
    ...TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: toInputSchema(t.schema) })),
    { name: RESPONDER_NAME, description: responderDescription, input_schema: toInputSchema(responderSchema) },
  ];
}
