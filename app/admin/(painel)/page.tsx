import Link from "next/link";
import { getStore } from "@/lib/db";

const INTENT_LABEL: Record<string, string> = {
  saudacao: "Saudação",
  produto: "Indicar produto",
  promocao: "Dúvida da promoção",
  cupons: "Cálculo de cupons",
  dia_t: "Ofertas do Dia T",
  cadastro_nota: "Cadastro de nota",
  loja: "Loja mais próxima",
  pedido: "Rastrear pedido",
  cartao: "Cartão Tumelero",
  humano: "Falar com humano",
  fora_escopo: "Fora do escopo",
  outro: "Outros",
};

function Bars({ rows, label }: { rows: { name: string; total: number }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  if (!rows.length) return <p className="text-sm text-black/50">Ainda sem dados.</p>;
  return (
    <ul className="space-y-2" aria-label={label}>
      {rows.map((r) => (
        <li key={r.name}>
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{r.name}</span>
            <span className="tabular-nums text-black/60">{r.total}</span>
          </div>
          <div className="mt-1 h-2.5 rounded-full bg-black/5">
            <div className="h-2.5 rounded-full bg-tumelero-laranja" style={{ width: `${(r.total / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function MetricsPage() {
  const m = await getStore().metrics();
  const cards = [
    { label: "Conversas", value: m.conversations },
    { label: "Mensagens", value: m.messages },
    { label: "Escaladas para humano", value: m.escalated, href: "/admin/conversas?status=escalada" },
  ];
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-black">Métricas</h1>
      <p className="text-sm text-black/60">Visão geral do atendimento do João (WhatsApp e simulador).</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const inner = (
            <>
              <p className="text-sm font-bold text-black/60">{c.label}</p>
              <p className="mt-1 text-4xl font-black tabular-nums">{c.value}</p>
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:ring-tumelero-laranja">
              {inner}
              <span className="text-[12px] font-bold text-tumelero-laranja">ver conversas →</span>
            </Link>
          ) : (
            <div key={c.label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              {inner}
            </div>
          );
        })}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-3 text-lg font-black">Intenções mais comuns</h2>
          <Bars label="Intenções" rows={m.intents.map((i) => ({ name: INTENT_LABEL[i.intent] ?? i.intent, total: i.total }))} />
        </section>
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-3 text-lg font-black">Ferramentas mais usadas</h2>
          <Bars label="Ferramentas" rows={m.tools.map((t) => ({ name: t.tool, total: t.total }))} />
        </section>
      </div>
    </div>
  );
}
