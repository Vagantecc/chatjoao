import { z } from "zod";
import { defineTool } from "./types";

export const ESCALATION_MESSAGE = "Vou chamar um colega da Tumelero pra te ajudar, tá? Já já alguém fala contigo. 🙌";

export const falarComHumano = defineTool({
  name: "falar_com_humano",
  description:
    "Encaminha a conversa para um atendente humano. Use quando o cliente pedir, quando houver reclamação séria, " +
    "pedido atrasado que ele queira resolver, ou quando você não conseguir resolver. Depois, responda com a mensagem de encaminhamento.",
  schema: z.object({ motivo: z.string().min(3).describe("Resumo de uma linha para o atendente") }),
  async run({ motivo }, ctx) {
    ctx.patch.status = "escalada";
    ctx.patch.escalation_reason = motivo;
    ctx.patch.escalated_at = ctx.now.toISOString();
    return {
      data: { ok: true, mensagem_sugerida: ESCALATION_MESSAGE, atendimento_geral: { whatsapp: "(51) 99811-1390", telefone: "(51) 3371-9290" } },
      summary: `escalada: ${motivo}`,
    };
  },
});
