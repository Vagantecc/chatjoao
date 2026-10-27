// Ferramenta final de cada turno: o modelo entrega a resposta estruturada
// (balões, anexos, botões ou lista). O motor converte isso em mensagens do WhatsApp.
import { z } from "zod";
import { WA_LIMITS } from "../messages";

export const INTENTS = [
  "saudacao",
  "produto",
  "promocao",
  "cupons",
  "dia_t",
  "cadastro_nota",
  "loja",
  "pedido",
  "cartao",
  "humano",
  "fora_escopo",
  "outro",
] as const;

export const RESPONDER_NAME = "responder";

export const responderSchema = z.object({
  baloes: z
    .array(z.string().min(1).max(WA_LIMITS.body))
    .min(1)
    .max(4)
    .describe("Balões de texto, na ordem. No máximo 3 frases curtas por balão. Formatação do WhatsApp (*negrito*, •)."),
  anexos: z
    .array(z.string())
    .max(4)
    .optional()
    .describe("Ids devolvidos pelas ferramentas (P1, L1, D1...). Entram logo depois do primeiro balão."),
  botoes: z
    .array(z.string().min(1).max(WA_LIMITS.buttonTitle))
    .max(WA_LIMITS.buttons)
    .optional()
    .describe("Até 3 respostas rápidas, cada uma com no máximo 20 caracteres. Vão junto do último balão."),
  lista: z
    .object({
      botao: z.string().min(1).max(WA_LIMITS.listButton).describe("Texto do botão que abre a lista (até 20 caracteres)"),
      opcoes: z
        .array(
          z.object({
            titulo: z.string().min(1).max(WA_LIMITS.rowTitle),
            descricao: z.string().max(WA_LIMITS.rowDescription).optional(),
          }),
        )
        .min(1)
        .max(WA_LIMITS.listRows),
    })
    .optional()
    .describe("Lista interativa (até 10 opções). Use no lugar dos botões quando houver mais de 3 escolhas."),
  intencao: z.enum(INTENTS).describe("Assunto principal desta mensagem do cliente"),
  resolvido: z
    .enum(["sim", "em_andamento", "nao"])
    .describe('"nao" quando você não conseguiu ajudar com o que o cliente pediu nesta mensagem'),
});

export type ResponderInput = z.infer<typeof responderSchema>;

export const responderDescription =
  "Envia a sua resposta ao cliente. Chame SEMPRE esta ferramenta para terminar o turno, depois de usar as outras ferramentas que precisar. " +
  "Não escreva a resposta como texto solto.";
