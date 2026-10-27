import { z } from "zod";
import { formatBRL } from "../time";
import { SITE_CATEGORIES, type CatalogProduct } from "../vtex/catalog";
import { defineTool } from "./types";

const MAX_RESULTS = 6;

export const buscarProdutos = defineTool({
  name: "buscar_produtos",
  description:
    "Busca produtos reais no site da Tumelero (catálogo VTEX, com fallback no catálogo local). " +
    "Traduza a necessidade do cliente em 1 a 3 termos curtos de produto, como no buscador de uma loja " +
    '(ex.: goteira → "manta líquida", "impermeabilizante", "telha"; pintar quarto → "tinta acrílica", "rolo de pintura"). ' +
    "Cada produto volta com um id (P1, P2...) para citar em `anexos` na resposta. Nunca invente preço, estoque ou link.",
  schema: z.object({
    termos: z.array(z.string().min(2).max(40)).min(1).max(3).describe("Termos de busca curtos, em português"),
  }),
  async run({ termos }, ctx) {
    let source: "vtex" | "fallback" = "vtex";
    let vtexError: string | null = null;
    let found: CatalogProduct[] = [];

    const settled = await Promise.allSettled(termos.map((t) => ctx.catalog.search(t)));
    const seen = new Set<string>();
    // Intercala os resultados dos termos para não lotar com um termo só.
    const lists = settled.map((s) => (s.status === "fulfilled" ? s.value : []));
    for (let i = 0; found.length < MAX_RESULTS && i < 10; i++) {
      for (const list of lists) {
        const p = list[i];
        if (p && !seen.has(p.link) && found.length < MAX_RESULTS) {
          seen.add(p.link);
          found.push(p);
        }
      }
    }
    const failures = settled.filter((s) => s.status === "rejected");
    if (failures.length) vtexError = String((failures[0] as PromiseRejectedResult).reason?.message ?? failures[0]);

    if (found.length === 0) {
      source = "fallback";
      const rows = await ctx.store.searchProducts(termos, MAX_RESULTS);
      found = rows.map((r) => ({
        id: `local-${r.id}`,
        name: r.name,
        brand: r.brand,
        link: r.link,
        imageUrl: r.image_url,
        price: Number(r.price),
        listPrice: null,
        available: 1,
        category: r.subcategory ?? r.category,
        categoryPath: null,
        source: "fallback" as const,
      }));
    }

    if (found.length === 0) {
      return {
        data: {
          produtos: [],
          aviso: "Nada encontrado. Diga isso com leveza, mande o link de uma categoria abaixo (só estas URLs) ou ofereça um vendedor.",
          categorias: SITE_CATEGORIES,
        },
        summary: `nenhum produto para ${termos.join(", ")}${vtexError ? ` (VTEX: ${vtexError})` : ""}`,
      };
    }

    const produtos = found.map((p) => {
      const id = ctx.attachments.add("P", [
        {
          type: "product",
          product: { name: p.name, price: p.price, listPrice: p.listPrice, imageUrl: p.imageUrl, link: p.link },
        },
      ]);
      return {
        id,
        nome: p.name,
        marca: p.brand,
        preco: formatBRL(p.price),
        ...(p.listPrice ? { preco_de: formatBRL(p.listPrice) } : {}),
        categoria: p.category,
        link_categoria: p.categoryPath ? `https://www.tumelero.com.br${p.categoryPath}` : undefined,
      };
    });

    return {
      data: {
        fonte: source === "vtex" ? "site (tempo real)" : "catálogo local (preço pode ter mudado; sugira conferir no link)",
        produtos,
        dica: "Escolha de 1 a 3 que resolvem o problema e cite os ids em `anexos`.",
      },
      summary: `${produtos.length} produto(s) via ${source}${vtexError ? ` · VTEX falhou: ${vtexError}` : ""}`,
    };
  },
});
