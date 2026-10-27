// LLM de ensaio por regras, SÓ para desenvolver a interface sem chave da Anthropic
// (JOAO_FAKE_LLM=1 em dev). Cobre os cenários de teste; não é o João de verdade.
import type Anthropic from "@anthropic-ai/sdk";
import type { LlmCall, LlmRequest, LlmResponse } from "../llm";

let n = 0;
const use = (name: string, input: unknown): LlmResponse => ({
  stop_reason: "tool_use",
  content: [{ type: "tool_use", id: `toolu_fake_${++n}`, name, input } as Anthropic.Beta.BetaToolUseBlock],
});
const reply = (input: Record<string, unknown>) => use("responder", { resolvido: "sim", ...input });

function lastUserText(req: LlmRequest): string {
  const last = req.messages.at(-1);
  if (!last?.content || typeof last.content === "string") return String(last?.content ?? "");
  const first = last.content[0] as { type: string; text?: string };
  return first.type === "text" ? (first.text ?? "") : "";
}

function toolResult(req: LlmRequest): { name: string; data: Record<string, unknown> } | null {
  const assistant = req.messages.at(-2);
  const last = req.messages.at(-1);
  if (!assistant || !last || !Array.isArray(last.content) || !Array.isArray(assistant.content)) return null;
  const res = (last.content as { type: string; content?: unknown; tool_use_id?: string }[]).find((b) => b.type === "tool_result");
  if (!res) return null;
  const call = (assistant.content as { type: string; id?: string; name?: string }[]).find((b) => b.id === res.tool_use_id);
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(String(res.content));
  } catch {
    data = { erro: String(res.content) };
  }
  return { name: call?.name ?? "", data };
}

export function createFakeLlm(): LlmCall {
  return async (req) => {
    const r = toolResult(req);
    if (r) {
      const d = r.data;
      switch (r.name) {
        case "buscar_produtos": {
          const ids = ((d.produtos as { id: string }[]) ?? []).slice(0, 3).map((p) => p.id);
          return reply({ baloes: ["Deixa comigo! 🔨 Separei estes aqui pra ti:", "Dá pra pagar em até 6x sem juros, Pix ou boleto. Quer ver a loja mais perto?"], anexos: ids, botoes: ["Loja mais perto", "Outras opções"], intencao: "produto" });
        }
        case "calcular_cupons":
          return reply({ baloes: [`Com essa compra você leva *${d.cupons} cupons* pro sorteio da Strada! 🚗`, "Quer cadastrar a nota agora?"], botoes: ["Cadastrar nota", "Ofertas do Dia T"], intencao: "cupons" });
        case "buscar_loja_proxima": {
          const lojas = (d.lojas as { id: string; nome: string; distancia: string }[]) ?? [];
          if (!lojas.length) return reply({ baloes: ["Bah, não achei esse endereço. Me passa o CEP?"], intencao: "loja", resolvido: "em_andamento" });
          return reply({ baloes: [`A mais pertinho é a *${lojas[0].nome}*, a uns ${lojas[0].distancia}. 🏠`, "Precisa de mais alguma coisa?"], anexos: lojas.map((l) => l.id), botoes: ["Achar um produto", "Promoção 60 anos 🚗"], intencao: "loja" });
        }
        case "rastrear_pedido": {
          if (!d.encontrado) return reply({ baloes: ["Não achei esse pedido. Confere o número pra mim?"], intencao: "pedido", resolvido: "em_andamento" });
          const linhas = (d.linha_do_tempo as string[]).map((l) => `• ${l}`).join("\n");
          return reply({ baloes: [`Pedido *${d.pedido}*: *${d.status_atual}*`, `${linhas}\n\nPrevisão: *${d.previsao}*`], botoes: ["Falar com atendente", "Achar um produto"], intencao: "pedido" });
        }
        case "consultar_cartao_tumelero":
          if (!d.verificado) return reply({ baloes: ["Hmm, os dados não bateram. Confere o CPF e a data de nascimento?"], intencao: "cartao", resolvido: "em_andamento" });
          return reply({ baloes: [`Pronto, ${d.titular}! Aqui tá a 2ª via do cartão final ${d.cartao_final}: ${d.valor}, vence ${d.vencimento}.`, "É um boleto fictício, só pra demonstração. 😉"], anexos: [d.id], botoes: ["Código Pix", "Ver limite"], intencao: "cartao" });
        default:
          return reply({ baloes: ["Feito! 🙌"], intencao: "outro" });
      }
    }

    const t = lastUserText(req).toLowerCase();
    if (/goteira|pingando|infiltra/.test(t)) return use("buscar_produtos", { termos: ["manta líquida", "impermeabilizante", "telha"] });
    if (/pintar|tinta/.test(t)) return use("buscar_produtos", { termos: ["tinta acrílica", "rolo de pintura", "fita crepe"] });
    if (/cupo/.test(t)) {
      const nums = [...t.matchAll(/r\$\s*([\d.,]+)/g)].map((m) => Number(m[1].replace(/\./g, "").replace(",", ".")));
      return use("calcular_cupons", { valor_total: nums[0] ?? 0, valor_dia_t: nums[1] ?? 0 });
    }
    const cep = t.match(/\b\d{5}-?\d{3}\b/);
    if (cep && !/cpf|\d{3}\.\d{3}/.test(t)) return use("buscar_loja_proxima", { cep: cep[0] });
    if (/localiza[cç][aã]o enviada/.test(t)) return use("buscar_loja_proxima", { usar_localizacao_enviada: true });
    const cidade = t.match(/moro em ([a-zà-ú ]+?)(,|\.|\?| tem|$)/);
    if (cidade) return use("buscar_loja_proxima", { cidade_ou_endereco: cidade[1].trim() });
    if (/loja mais perto/.test(t)) return reply({ baloes: ["Bora achar! Me manda teu CEP ou a cidade. Se preferir, toca no 📎 e envia a localização."], intencao: "loja", resolvido: "em_andamento" });
    const pedido = t.match(/\b1\d{5}\b/);
    if (pedido) return use("rastrear_pedido", { numero_pedido: pedido[0] });
    const cpf = t.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
    const nasc = t.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (cpf && nasc) return use("consultar_cartao_tumelero", { cpf: cpf[0], data_nascimento: `${nasc[3]}-${nasc[2]}-${nasc[1]}`, acao: "boleto" });
    if (/cart[aã]o/.test(t)) return reply({ baloes: ["Bora tirar essa 2ª via! Por segurança, me passa teu CPF e a data de nascimento?", "Fica tranquilo: nunca vou te pedir senha nem o número do cartão. 🙌"], intencao: "cartao", resolvido: "em_andamento" });
    if (/atendente|humano|pessoa/.test(t)) return use("falar_com_humano", { motivo: "cliente pediu atendente" });
    return reply({ baloes: ["(modo ensaio) Essa eu só respondo com a chave da Anthropic configurada. 😅"], intencao: "outro", resolvido: "em_andamento" });
  };
}
