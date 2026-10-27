"use client";

import { CrudTable } from "@/components/admin/CrudTable";

export default function RegulamentoPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-black">Regulamento da promoção</h1>
      <p className="mb-4 max-w-2xl text-sm text-black/60">
        O João responde dúvidas da Promoção 60 Anos <strong>só</strong> com o que está aqui. Cada item é um trecho; as palavras-chave ajudam ele a achar o
        trecho certo. A fórmula de cupons (R$ 300 por cupom, Dia T em dobro) está no código da ferramenta calcular_cupons.
      </p>
      <CrudTable
        table="promo_rules"
        sortBy={(a, b) => Number(a.sort_order) - Number(b.sort_order)}
        defaults={{ sort_order: 99, keywords: [] }}
        columns={[
          { key: "sort_order", label: "Ordem", type: "number", inList: true },
          { key: "title", label: "Título", type: "text", inList: true },
          { key: "content", label: "Texto do regulamento", type: "textarea", inList: true },
          { key: "keywords", label: "Palavras-chave", type: "list", hint: "Separadas por vírgula. Ex.: sorteio, data, loteria" },
          { key: "slug", label: "Identificador", type: "text", hint: "Sem espaço nem acento. Ex.: quem-participa" },
        ]}
      />
    </div>
  );
}
