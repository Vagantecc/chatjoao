"use client";

import { CrudTable } from "@/components/admin/CrudTable";

export default function FeriadosPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-black">Feriados</h1>
      <p className="mb-4 max-w-2xl text-sm text-black/60">Usados para mostrar o horário certo da loja no dia. Feriado municipal vale só para a cidade informada.</p>
      <CrudTable
        table="holidays"
        pk="date"
        searchKeys={["name", "date", "city"]}
        sortBy={(a, b) => String(a.date).localeCompare(String(b.date))}
        defaults={{ scope: "nacional" }}
        columns={[
          { key: "date", label: "Data", type: "date", inList: true },
          { key: "name", label: "Nome", type: "text", inList: true },
          { key: "scope", label: "Abrangência", type: "select", options: ["nacional", "estadual", "municipal"], inList: true },
          { key: "city", label: "Cidade (se municipal)", type: "text", nullable: true, inList: true },
        ]}
      />
    </div>
  );
}
