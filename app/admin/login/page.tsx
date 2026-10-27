"use client";

import Image from "next/image";
import { useState } from "react";

export default function LoginPage() {
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senha }) });
    if (res.ok) {
      window.location.href = "/admin";
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setError(data.error ?? "Não deu certo.");
    setLoading(false);
  };

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-tumelero-marinho px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <Image src="/joao-avatar.png" alt="" width={48} height={48} className="rounded-full" />
          <div>
            <h1 className="text-xl font-black text-tumelero-marinho">Painel do João</h1>
            <p className="text-sm text-black/60">Tumelero · acesso restrito</p>
          </div>
        </div>
        <label htmlFor="senha" className="mt-6 block text-sm font-bold text-tumelero-marinho">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mt-1 h-11 w-full rounded-lg border border-black/20 px-3"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !senha}
          className="mt-5 h-11 w-full rounded-lg bg-tumelero-laranja font-extrabold text-tumelero-marinho hover:bg-[#ff7a2c] disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
