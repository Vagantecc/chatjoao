// Simulador web: mesma entrada do WhatsApp, mas devolve as mensagens e o rastro
// das ferramentas para o painel do modo demo.
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleIncoming } from "@/lib/joao-brain";
import { getStore } from "@/lib/db";
import { getBrainDeps, llmConfigured, publicAppUrl } from "@/lib/runtime";

export const runtime = "nodejs";
export const maxDuration = 60;

const body = z.object({
  phone: z.string().regex(/^sim:[\w-]{8,64}$/),
  reset: z.boolean().optional(),
  message: z
    .discriminatedUnion("type", [
      z.object({ type: z.literal("text"), text: z.string().min(1).max(2000) }),
      z.object({ type: z.literal("reply"), id: z.string().max(80), title: z.string().min(1).max(80) }),
      z.object({ type: z.literal("location"), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), name: z.string().max(80).optional(), address: z.string().max(160).optional() }),
    ])
    .optional(),
});

// Freio simples contra abuso do simulador público (por instância).
const hits = new Map<string, number[]>();
function rateLimited(key: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  const { phone, reset, message } = parsed.data;

  if (reset) {
    await getStore().resetConversation(phone);
    return NextResponse.json({ ok: true });
  }
  if (!message) return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { messages: [{ type: "text", text: "Calma, tchê! 😅 Muitas mensagens em pouco tempo. Espera um minutinho e manda de novo." }], trace: [], intent: null, escalated: false },
      { status: 429 },
    );
  }

  if (!llmConfigured() && !(message.type === "text" && message.text === "__start__")) {
    return NextResponse.json({
      messages: [{ type: "text", text: "⚙️ O João ainda não tem cérebro: falta configurar ANTHROPIC_API_KEY no .env.local (veja o README)." }],
      trace: [],
      intent: null,
      escalated: false,
    });
  }

  const result = await handleIncoming(getBrainDeps(publicAppUrl(req)), { phone, channel: "web", message });
  return NextResponse.json(result);
}
