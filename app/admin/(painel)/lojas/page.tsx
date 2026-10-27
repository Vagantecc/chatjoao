"use client";

import { CrudTable } from "@/components/admin/CrudTable";

const HOURS_HINT =
  'Formato: {"week": {"mon": [["08:00","19:00"]], ..., "sun": []}, "holiday": [["09:00","17:00"]], "seasonal": [{"months": [10,11,12,1,2], "day": "sun", "ranges": [["09:00","12:00"]]}]}. Deixe vazio se ainda não souber: o João pede para confirmar com a loja. Sem "holiday", ele avisa que o horário de feriado precisa ser confirmado.';

export default function LojasPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-black">Lojas</h1>
      <p className="mb-4 max-w-2xl text-sm text-black/60">
        Complete com as lojas de tumelero.com.br/nossas-lojas. Latitude e longitude dá para pegar no Google Maps (clique com o botão direito no ponto).
      </p>
      <CrudTable
        table="stores"
        searchKeys={["name", "city"]}
        defaults={{ active: true, whatsapp: [], hours: null }}
        columns={[
          { key: "name", label: "Nome", type: "text", inList: true },
          { key: "city", label: "Cidade", type: "text", inList: true },
          { key: "address", label: "Endereço", type: "text", inList: true },
          { key: "neighborhood", label: "Bairro", type: "text", nullable: true },
          { key: "cep", label: "CEP", type: "text", nullable: true },
          { key: "whatsapp", label: "WhatsApp", type: "list", inList: true, hint: "Separados por vírgula" },
          { key: "phone", label: "Telefone", type: "text", nullable: true },
          { key: "lat", label: "Latitude", type: "number" },
          { key: "lng", label: "Longitude", type: "number" },
          { key: "hours", label: "Horários (JSON)", type: "json", hint: HOURS_HINT },
          { key: "active", label: "Ativa", type: "bool", inList: true },
          { key: "slug", label: "Identificador", type: "text", hint: "Sem espaço nem acento. Ex.: canoas" },
        ]}
      />
    </div>
  );
}
