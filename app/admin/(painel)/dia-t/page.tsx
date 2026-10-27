"use client";

import { CrudTable } from "@/components/admin/CrudTable";

export default function DiaTPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-black">Ofertas do Dia T</h1>
      <p className="mb-4 max-w-2xl text-sm text-black/60">
        Produtos que contam em dobro nos cupons. O João mostra as ofertas da data de hoje (ou a próxima data cadastrada). O link precisa ser do site da Tumelero.
      </p>
      <CrudTable
        table="ofertas_dia_t"
        searchKeys={["product_name", "date"]}
        sortBy={(a, b) => String(b.date).localeCompare(String(a.date))}
        defaults={{ date: new Date().toISOString().slice(0, 10) }}
        columns={[
          { key: "date", label: "Data", type: "date", inList: true },
          { key: "product_name", label: "Produto", type: "text", inList: true },
          { key: "price", label: "Preço da oferta", type: "number", inList: true },
          { key: "normal_price", label: "Preço normal", type: "number", nullable: true, inList: true },
          { key: "link", label: "Link do produto", type: "text", placeholder: "https://www.tumelero.com.br/.../p" },
          { key: "image_url", label: "URL da imagem", type: "text", nullable: true },
        ]}
      />
    </div>
  );
}
