// Chamada ao Claude. O motor recebe esta função por injeção, então os testes
// trocam por um LLM roteirizado sem tocar na API.
import Anthropic from "@anthropic-ai/sdk";

export type LlmRequest = Omit<Anthropic.Beta.MessageCreateParamsNonStreaming, "model" | "max_tokens" | "betas">;
export type LlmResponse = Pick<Anthropic.Beta.BetaMessage, "content" | "stop_reason">;
export type LlmCall = (req: LlmRequest) => Promise<LlmResponse>;

export const DEFAULT_MODEL = "claude-sonnet-5-5";

export function createAnthropicLlm(opts: { apiKey?: string; model?: string } = {}): LlmCall {
  const client = new Anthropic({ apiKey: opts.apiKey ?? process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 60_000 });
  const model = opts.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  return (req) =>
    client.beta.messages.create({
      model,
      max_tokens: 16000,
      // Se o modelo recusar por política, a API tenta um modelo reserva na mesma chamada.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Conversa de atendimento: pensar pouco deixa a resposta rápida.
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      ...req,
    });
}
