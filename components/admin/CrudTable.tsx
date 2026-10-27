"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type ColType = "text" | "textarea" | "number" | "bool" | "date" | "list" | "json" | "select";

export interface Col {
  key: string;
  label: string;
  type: ColType;
  options?: string[];
  hint?: string;
  /** Mostrar na listagem (o formulário sempre mostra todas). */
  inList?: boolean;
  nullable?: boolean;
  placeholder?: string;
}

type Row = Record<string, unknown>;

function toInput(col: Col, v: unknown): string {
  if (v === null || v === undefined) return "";
  if (col.type === "list") return (v as string[]).join(", ");
  if (col.type === "json") return JSON.stringify(v, null, 2);
  return String(v);
}

function fromInput(col: Col, s: string): unknown {
  const t = s.trim();
  switch (col.type) {
    case "number":
      return t === "" ? (col.nullable ? null : NaN) : Number(t.replace(",", "."));
    case "bool":
      return s === "true";
    case "list":
      return t ? t.split(",").map((x) => x.trim()).filter(Boolean) : [];
    case "json":
      if (!t) return null;
      return JSON.parse(t);
    default:
      return t === "" && col.nullable ? null : t;
  }
}

function display(col: Col, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (col.type === "bool") return v ? "sim" : "não";
  if (col.type === "list") return (v as string[]).join(", ") || "—";
  if (col.type === "json") return "{…}";
  if (col.type === "number" && typeof v === "number" && /price|preco/.test(col.key)) return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return String(v);
}

export function CrudTable({
  table,
  columns,
  pk = "id",
  sortBy,
  searchKeys = [],
  defaults = {},
}: {
  table: string;
  columns: Col[];
  pk?: string;
  sortBy?: (a: Row, b: Row) => number;
  searchKeys?: string[];
  defaults?: Row;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/data/${table}`);
    const data = (await res.json()) as { rows?: Row[]; error?: string };
    setRows(data.rows ?? []);
    setError(data.error ?? null);
    setLoading(false);
  }, [table]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (row: Row | null) => {
    const base = row ?? { ...defaults };
    setEditing(row ?? {});
    setForm(Object.fromEntries(columns.map((c) => [c.key, toInput(c, base[c.key])])));
    setError(null);
  };

  const save = async () => {
    let payload: Row;
    try {
      payload = Object.fromEntries(columns.map((c) => [c.key, fromInput(c, form[c.key] ?? "")]));
    } catch {
      setError("Algum campo JSON está com formato inválido.");
      return;
    }
    if (editing && editing[pk] !== undefined) payload[pk] = editing[pk];
    const res = await fetch(`/api/admin/data/${table}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Não foi possível salvar.");
      return;
    }
    setEditing(null);
    setNotice("Salvo! O João já usa a versão nova.");
    setTimeout(() => setNotice(null), 3000);
    await load();
  };

  const remove = async (row: Row) => {
    if (!confirm("Excluir este registro? Não dá para desfazer.")) return;
    await fetch(`/api/admin/data/${table}?key=${encodeURIComponent(String(row[pk]))}`, { method: "DELETE" });
    await load();
  };

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = term ? rows.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(term))) : rows;
    return sortBy ? [...filtered].sort(sortBy) : filtered;
  }, [rows, q, searchKeys, sortBy]);

  const listCols = columns.filter((c) => c.inList);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {searchKeys.length > 0 && (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            aria-label="Buscar"
            className="h-10 w-full max-w-xs rounded-lg border border-black/15 bg-white px-3 text-sm"
          />
        )}
        <button type="button" onClick={() => open(null)} className="h-10 rounded-lg bg-tumelero-laranja px-4 text-sm font-extrabold text-tumelero-marinho hover:bg-[#ff7a2c]">
          + Novo
        </button>
        <span className="text-sm text-black/50">{loading ? "carregando…" : `${visible.length} registro(s)`}</span>
        {notice && (
          <span role="status" className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
            {notice}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[#f7f5f2] text-[12px] uppercase tracking-wide text-black/60">
            <tr>
              {listCols.map((c) => (
                <th key={c.key} className="px-3 py-2.5 font-bold">
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-bold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={String(r[pk])} className="border-t border-black/5 align-top hover:bg-[#fffaf6]">
                {listCols.map((c) => (
                  <td key={c.key} className="max-w-[360px] px-3 py-2.5">
                    <span className={c.type === "textarea" ? "line-clamp-3" : "line-clamp-2"}>{display(c, r[c.key])}</span>
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <button type="button" onClick={() => open(r)} className="rounded px-2 py-1 font-semibold text-tumelero-marinho hover:bg-black/5">
                    Editar
                  </button>
                  <button type="button" onClick={() => remove(r)} className="rounded px-2 py-1 font-semibold text-red-700 hover:bg-red-50">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-label="Editar registro" onClick={() => setEditing(null)}>
          <form
            className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <header className="flex items-center justify-between border-b border-black/10 px-5 py-4">
              <h2 className="text-lg font-black text-tumelero-marinho">{editing[pk] !== undefined ? "Editar" : "Novo registro"}</h2>
              <button type="button" onClick={() => setEditing(null)} className="rounded px-2 py-1 text-sm font-semibold hover:bg-black/5">
                Cancelar
              </button>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {columns.map((c) => {
                const id = `f-${c.key}`;
                const common = "w-full rounded-lg border border-black/15 px-3 py-2 text-sm";
                return (
                  <div key={c.key}>
                    <label htmlFor={id} className="mb-1 block text-sm font-bold text-tumelero-marinho">
                      {c.label}
                    </label>
                    {c.type === "textarea" || c.type === "json" ? (
                      <textarea
                        id={id}
                        rows={c.type === "json" ? 10 : 5}
                        value={form[c.key] ?? ""}
                        placeholder={c.placeholder}
                        onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                        className={`${common} ${c.type === "json" ? "font-mono text-[12.5px]" : ""}`}
                      />
                    ) : c.type === "bool" ? (
                      <select id={id} value={form[c.key] || "true"} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} className={common}>
                        <option value="true">sim</option>
                        <option value="false">não</option>
                      </select>
                    ) : c.type === "select" ? (
                      <select id={id} value={form[c.key] ?? ""} onChange={(e) => setForm({ ...form, [c.key]: e.target.value })} className={common}>
                        {c.options?.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={id}
                        type={c.type === "date" ? "date" : "text"}
                        inputMode={c.type === "number" ? "decimal" : undefined}
                        value={form[c.key] ?? ""}
                        placeholder={c.placeholder}
                        onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                        className={common}
                      />
                    )}
                    {c.hint && <p className="mt-1 text-[12px] text-black/55">{c.hint}</p>}
                  </div>
                );
              })}
            </div>
            <footer className="border-t border-black/10 px-5 py-4">
              {error && (
                <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </p>
              )}
              <button type="submit" className="h-11 w-full rounded-lg bg-tumelero-marinho font-extrabold text-white hover:bg-[#2a3a63]">
                Salvar
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
