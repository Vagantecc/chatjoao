// Webhook da WhatsApp Cloud API (Meta).
// GET: verificação do endpoint (hub.challenge). POST: mensagens dos clientes.
// Responde 200 na hora e processa depois com `after()`, para a Meta não reenviar.
import { after, NextResponse } from "next/server";
import { handleIncoming } from "@/lib/joao-brain";
import { getBrainDeps, publicAppUrl } from "@/lib/runtime";
import { parseWebhook } from "@/lib/whatsapp/parse";
import { markReadAndTyping, sendMessages, validSignature } from "@/lib/whatsapp/send";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (secret && !validSignature(raw, req.headers.get("x-hub-signature-256"), secret)) {
    return new Response("Assinatura inválida", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const incoming = parseWebhook(body);
  if (incoming.length === 0) return NextResponse.json({ ok: true }); // status de entrega/leitura etc.

  const deps = getBrainDeps(publicAppUrl(req));
  after(async () => {
    for (const msg of incoming) {
      try {
        await markReadAndTyping(msg.id).catch((e) => console.warn("[whatsapp] não marcou como lida:", e.message));
        const result = await handleIncoming(deps, { phone: msg.from, channel: "whatsapp", message: msg.message, waMessageId: msg.id });
        if (result.duplicate) continue;
        await sendMessages(msg.from, result.messages);
      } catch (err) {
        console.error("[whatsapp] falha ao responder", msg.id, err);
      }
    }
  });

  return NextResponse.json({ ok: true });
}
