// CRUD genérico das tabelas editáveis do painel (protegido pelo middleware).
import { NextResponse } from "next/server";
import { EDITABLE, isEditable } from "@/lib/admin/schemas";
import { getStore } from "@/lib/db";

type Ctx = { params: Promise<{ table: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { table } = await params;
  if (!isEditable(table)) return NextResponse.json({ error: "Tabela desconhecida" }, { status: 404 });
  return NextResponse.json({ rows: await getStore().listTable(table) });
}

export async function POST(req: Request, { params }: Ctx) {
  const { table } = await params;
  if (!isEditable(table)) return NextResponse.json({ error: "Tabela desconhecida" }, { status: 404 });
  const parsed = EDITABLE[table].safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".") || "registro"}: ${i.message}`).join("; ") }, { status: 400 });
  }
  try {
    const row = await getStore().upsertRow(table, parsed.data as Record<string, unknown>);
    return NextResponse.json({ row });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { table } = await params;
  if (!isEditable(table)) return NextResponse.json({ error: "Tabela desconhecida" }, { status: 404 });
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Informe key" }, { status: 400 });
  await getStore().deleteRow(table, /^\d+$/.test(key) ? Number(key) : key);
  return NextResponse.json({ ok: true });
}
