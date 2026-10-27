"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StatusButton({ id, status }: { id: string; status: "ativa" | "escalada" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const next = status === "escalada" ? "ativa" : "escalada";
  const toggle = async () => {
    setLoading(true);
    await fetch(`/api/admin/conversations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    setLoading(false);
    router.refresh();
  };
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className="rounded-lg bg-tumelero-marinho px-3 py-2 text-sm font-bold text-white hover:bg-[#2a3a63] disabled:opacity-60"
    >
      {status === "escalada" ? "Atendimento concluído: devolver ao João" : "Marcar como escalada"}
    </button>
  );
}
