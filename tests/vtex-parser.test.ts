import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { categoryToPath, createVtexCatalog, parseVtexProducts } from "@/lib/vtex/catalog";

const fixture = JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures", "vtex-search.json"), "utf8"));

describe("parseVtexProducts", () => {
  it("extrai nome, link, imagem, preço e estoque", () => {
    const [p] = parseVtexProducts(fixture);
    expect(p).toMatchObject({
      name: "Manta Líquida Vedalage Branco Viapol",
      link: "https://www.tumelero.com.br/manta-liquida-vedalage-branco-viapol/p",
      price: 259.9,
      listPrice: 299.9,
      available: 99999,
      category: "Mantas Líquidas",
      categoryPath: "/materiais-de-construcao/impermeabilizantes/mantas-liquidas",
      source: "vtex",
    });
    expect(p.imageUrl).toMatch(/^https:\/\/tumelerosaintgobain\.vteximg\.com\.br\//);
  });

  it("descarta produto sem estoque, sem preço ou sem itens", () => {
    const names = parseVtexProducts(fixture).map((p) => p.name);
    expect(names).not.toContain("Produto Sem Estoque Teste");
    expect(names).not.toContain("Produto Sem Itens");
    expect(names).toHaveLength(2);
  });

  it("descarta link fora do domínio da Tumelero", () => {
    const evil = structuredClone(fixture[0]);
    evil.link = "https://golpe.example.com/p";
    expect(parseVtexProducts([evil])).toEqual([]);
  });

  it("aguenta resposta inesperada", () => {
    expect(parseVtexProducts(null)).toEqual([]);
    expect(parseVtexProducts({ error: "x" })).toEqual([]);
    expect(parseVtexProducts([{}])).toEqual([]);
  });
});

describe("categoryToPath", () => {
  it("gera o slug igual ao do site", () => {
    expect(categoryToPath("/Pisos e Revestimentos/Pisos/Pisos Cerâmicos/")).toBe("/pisos-e-revestimentos/pisos/pisos-ceramicos");
  });
});

describe("createVtexCatalog", () => {
  it("usa %20 no termo e faz cache por 10 minutos", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 }));
    const catalog = createVtexCatalog({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const first = await catalog.search("Manta Líquida");
    await catalog.search("manta líquida ");
    expect(first).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const url = String((fetchImpl.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("ft=manta%20l%C3%ADquida");
    expect(url).toContain("_from=0&_to=9");
  });

  it("propaga erro HTTP para o fallback assumir", async () => {
    const fetchImpl = vi.fn(async () => new Response("bloqueado", { status: 429 }));
    const catalog = createVtexCatalog({ fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(catalog.search("tinta")).rejects.toThrow(/429/);
  });
});
