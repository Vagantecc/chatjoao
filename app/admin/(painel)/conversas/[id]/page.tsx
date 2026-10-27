import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";
import { formatDateTimeBR } from "@/lib/time";
import { WaText } from "@/lib/wa-format";
import { StatusButton } from "./StatusButton";

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const conv = await store.conversationById(id);
  if (!conv) notFound();
  const messages = await store.allMessages(id);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/conversas" className="text-sm font-bold text-black/60 hover:text-black">
        ← Conversas
      </Link>
      <header className="mt-2 flex flex-wrap items-start justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div>
          <h1 className="text-xl font-black">{conv.customer_name ?? (conv.channel === "web" ? "Visitante do simulador" : `+${conv.phone}`)}</h1>
          <p className="text-sm text-black/60">
            {conv.channel === "web" ? "Simulador" : `WhatsApp +${conv.phone}`} · {conv.city ?? "cidade não informada"}
            {conv.cep ? ` · CEP ${conv.cep}` : ""}
          </p>
          {conv.status === "escalada" && (
            <p className="mt-1 text-sm">
              <span className="rounded bg-tumelero-laranja px-1.5 py-0.5 text-[11px] font-bold">escalada</span> {conv.escalation_reason}
              {conv.escalated_at ? ` · ${formatDateTimeBR(conv.escalated_at)}` : ""}
            </p>
          )}
        </div>
        <StatusButton id={conv.id} status={conv.status} />
      </header>

      <ol className="mt-4 space-y-2">
        {messages.map((m) => (
          <li key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm ${m.role === "user" ? "bg-wa-out" : "bg-white"}`}>
              <WaText text={m.content} />
              <p className="mt-1 text-right text-[11px] text-black/45">
                {formatDateTimeBR(m.created_at)}
                {m.intent ? ` · ${m.intent}` : ""}
              </p>
            </div>
            {m.tool_calls?.map((t, i) => (
              <details key={i} className="mt-1 max-w-[85%] rounded-lg bg-tumelero-marinho/5 px-2 py-1 text-[12px]">
                <summary className="cursor-pointer font-mono font-bold">
                  {t.name} <span className={t.ok ? "text-green-700" : "text-red-700"}>{t.ok ? "ok" : "erro"}</span> · {t.summary}
                </summary>
                <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[11.5px]">{JSON.stringify(t.input, null, 2)}</pre>
              </details>
            ))}
          </li>
        ))}
      </ol>
    </div>
  );
}
