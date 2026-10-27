"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Métricas" },
  { href: "/admin/conversas", label: "Conversas" },
  { href: "/admin/regulamento", label: "Regulamento" },
  { href: "/admin/dia-t", label: "Ofertas do Dia T" },
  { href: "/admin/lojas", label: "Lojas" },
  { href: "/admin/feriados", label: "Feriados" },
  { href: "/admin/produtos", label: "Produtos (fallback)" },
];

export function AdminNav({ storeKind }: { storeKind: "supabase" | "memory" }) {
  const path = usePathname();
  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };
  return (
    <nav className="flex shrink-0 flex-col bg-tumelero-marinho text-white md:h-[100dvh] md:w-60" aria-label="Painel">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <Image src="/joao-avatar.png" alt="" width={36} height={36} className="rounded-full" />
        <div className="leading-tight">
          <p className="font-black">Painel do João</p>
          <p className="text-[12px] text-white/60">{storeKind === "supabase" ? "Supabase conectado" : "modo memória (sem banco)"}</p>
        </div>
      </div>
      <ul className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
        {LINKS.map((l) => {
          const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-lg px-3 py-2 text-sm font-bold ${active ? "bg-tumelero-laranja text-tumelero-marinho" : "text-white/85 hover:bg-white/10"}`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto hidden space-y-1 px-4 py-4 text-sm md:block">
        <Link href="/#chat" className="block text-white/80 hover:text-white">
          Abrir simulador ↗
        </Link>
        <button type="button" onClick={logout} className="text-white/80 hover:text-white">
          Sair
        </button>
      </div>
    </nav>
  );
}
