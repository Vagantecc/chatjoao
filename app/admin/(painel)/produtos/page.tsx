"use client";

import { CrudTable } from "@/components/admin/CrudTable";

export default function ProdutosPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-black">Produtos de fallback</h1>
      <p className="mb-4 max-w-2xl text-sm text-black/60">
        O João busca primeiro no site em tempo real. Esta lista só entra quando o site não responde. As palavras-chave ligam o problema do cliente ao
        produto (ex.: goteira → manta líquida).
      </p>
      <CrudTable
        table="products"
        searchKeys={["name", "category", "brand"]}
        defaults={{ active: true, keywords: [] }}
        columns={[
          { key: "name", label: "Nome", type: "text", inList: true },
          { key: "category", label: "Categoria", type: "text", inList: true },
          { key: "subcategory", label: "Subcategoria", type: "text", nullable: true },
          { key: "brand", label: "Marca", type: "text", nullable: true },
          { key: "price", label: "Preço", type: "number", inList: true },
          { key: "link", label: "Link do produto", type: "text", placeholder: "https://www.tumelero.com.br/.../p" },
          { key: "image_url", label: "URL da imagem", type: "text", nullable: true },
          { key: "keywords", label: "Palavras-chave", type: "list", inList: true, hint: "Separadas por vírgula" },
          { key: "active", label: "Ativo", type: "bool", inList: true },
        ]}
      />
    </div>
  );
}
