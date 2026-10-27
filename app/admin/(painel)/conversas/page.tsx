import Link from "next/link";
import { getStore } from "@/lib/db";
import { formatDateTimeBR } from "@/lib/time";

export default async function ConversasPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = status === "escalada" ? "escalada" : undefined;
  const list = await getStore().listConversations(filter ? { status: filter } : undefined);
  const tab = (href: string, label: string, active: boolean) => (
    <Link href={href} aria-current={active ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-sm font-bold ${active ? "bg-tumelero-marinho text-white" : "bg-white text-tumelero-marinho ring-1 ring-black/10"}`}>
      {label}
    </Link>
  );
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-black">Conversas</h1>
      <div className="mt-3 flex gap-2">
        {tab("/admin/conversas", "Todas", !filter)}
        {tab("/admin/conversas?status=escalada", "Escaladas para humano", !!filter)}
      </div>
      <ul className="mt-4 divide-y divide-black/5 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        {list.length === 0 && <li className="p-4 text-sm text-black/50">Nenhuma conversa ainda.</li>}
        {list.map((c) => (
          <li key={c.id}>
            <Link href={`/admin/conversas/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#fffaf6]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tumelero-barro/30 text-sm font-black">
                {(c.customer_name ?? "?").slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{c.customer_name ?? (c.channel === "web" ? "Visitante do simulador" : `+${c.phone}`)}</span>
                  <span className="rounded bg-black/5 px-1.5 py-0.5 text-[11px] font-bold uppercase">{c.channel === "web" ? "simulador" : "whatsapp"}</span>
                  {c.status === "escalada" && <span className="rounded bg-tumelero-laranja px-1.5 py-0.5 text-[11px] font-bold">escalada</span>}
                </span>
                <span className="block truncate text-sm text-black/60">
                  {c.escalation_reason ? `Motivo: ${c.escalation_reason}` : (c.last_message ?? `${c.message_count} mensagem(ns)`)}
                </span>
              </span>
              <span className="shrink-0 text-right text-[12px] text-black/50">
                {formatDateTimeBR(c.last_message_at)}
                <br />
                {c.city ?? ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
