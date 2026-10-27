import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_MAX_AGE, sessionToken } from "@/lib/admin/auth";

export async function POST(req: Request) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return NextResponse.json({ error: "Defina ADMIN_PASSWORD para usar o painel." }, { status: 503 });
  const { senha } = (await req.json().catch(() => ({}))) as { senha?: string };
  // Pequena espera fixa: dificulta tentativa e erro em sequência.
  await new Promise((r) => setTimeout(r, 400));
  if (senha !== password) return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await sessionToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
  return res;
}
