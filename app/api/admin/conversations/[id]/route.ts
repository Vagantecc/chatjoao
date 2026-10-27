import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/db";

const body = z.object({ status: z.enum(["ativa", "escalada"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "status inválido" }, { status: 400 });
  const store = getStore();
  if (!(await store.conversationById(id))) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  await store.updateConversation(id, {
    status: parsed.data.status,
    failed_attempts: 0,
    ...(parsed.data.status === "ativa" ? { escalation_reason: null, escalated_at: null } : { escalated_at: new Date().toISOString(), escalation_reason: "marcada no painel" }),
  });
  return NextResponse.json({ ok: true });
}
