// Cliente mínimo da Graph API para enviar mensagens e marcar como lida.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { OutMessage } from "../messages";
import { toGraphPayloads, type GraphPayload } from "./convert";

const GRAPH = "https://graph.facebook.com/v23.0";

function config() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new Error("WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID precisam estar configurados");
  return { token, url: `${GRAPH}/${phoneNumberId}/messages` };
}

async function post(payload: Record<string, unknown>): Promise<void> {
  const { token, url } = config();
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Graph API ${res.status}: ${(await res.text()).slice(0, 500)}`);
}

/** Marca como lida e mostra "digitando…" enquanto o João pensa. */
export async function markReadAndTyping(messageId: string): Promise<void> {
  await post({ messaging_product: "whatsapp", status: "read", message_id: messageId, typing_indicator: { type: "text" } });
}

/** Envia na ordem. Se um card com imagem falhar, tenta de novo sem a imagem. */
export async function sendMessages(to: string, messages: OutMessage[]): Promise<void> {
  for (const m of messages) {
    for (const payload of toGraphPayloads(to, m)) {
      try {
        await post(payload);
      } catch (err) {
        const fallback = withoutHeader(payload);
        if (!fallback) throw err;
        await post(fallback);
      }
    }
  }
}

function withoutHeader(p: GraphPayload): GraphPayload | null {
  const interactive = p.interactive as { header?: unknown } | undefined;
  if (!interactive?.header) return null;
  const { header: _h, ...rest } = interactive;
  return { ...p, interactive: rest };
}

/** Confere X-Hub-Signature-256 (HMAC-SHA256 do corpo com o App Secret). */
export function validSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
