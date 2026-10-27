// Busca no catálogo público da VTEX do site da Tumelero.
// GET /api/catalog_system/pub/products/search?ft={termo}&_from=0&_to=9
// Timeout de 5s e cache de 10 min por termo.

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string | null;
  link: string;
  imageUrl: string | null;
  price: number;
  listPrice: number | null;
  available: number;
  category: string | null;
  categoryPath: string | null; // "/materiais-de-construcao/impermeabilizantes/mantas-liquidas"
  source: "vtex" | "fallback";
}

const BASE = "https://www.tumelero.com.br";
const TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 10 * 60_000;

/** "/Materiais de Construção/Impermeabilizantes/" → "/materiais-de-construcao/impermeabilizantes" */
export function categoryToPath(category: string): string {
  return (
    "/" +
    category
      .split("/")
      .filter(Boolean)
      .map((seg) =>
        seg
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      )
      .join("/")
  );
}

type VtexRaw = {
  productId?: string;
  productName?: string;
  brand?: string;
  link?: string;
  categories?: string[];
  items?: {
    images?: { imageUrl?: string }[];
    sellers?: { commertialOffer?: { Price?: number; ListPrice?: number; AvailableQuantity?: number } }[];
  }[];
};

/**
 * Converte a resposta da VTEX em produtos. Descarta o que não dá para mostrar com
 * segurança: sem item, sem preço, sem estoque ou com link fora do site.
 */
export function parseVtexProducts(json: unknown): CatalogProduct[] {
  if (!Array.isArray(json)) return [];
  const out: CatalogProduct[] = [];
  for (const raw of json as VtexRaw[]) {
    const item = raw.items?.[0];
    const offer = item?.sellers?.[0]?.commertialOffer;
    const price = offer?.Price;
    const available = offer?.AvailableQuantity ?? 0;
    if (!raw.productName || !raw.link || !item || typeof price !== "number" || price <= 0 || available <= 0) continue;
    let link: URL;
    try {
      link = new URL(raw.link);
    } catch {
      continue;
    }
    if (!link.hostname.endsWith("tumelero.com.br")) continue;
    const deepest = raw.categories?.[0] ?? null; // a VTEX lista da mais específica para a mais geral
    out.push({
      id: String(raw.productId ?? raw.link),
      name: raw.productName.trim(),
      brand: raw.brand ?? null,
      link: link.toString(),
      imageUrl: item.images?.[0]?.imageUrl ?? null,
      price,
      listPrice: typeof offer?.ListPrice === "number" && offer.ListPrice > price ? offer.ListPrice : null,
      available,
      category: deepest ? (deepest.split("/").filter(Boolean).at(-1) ?? null) : null,
      categoryPath: deepest ? categoryToPath(deepest) : null,
      source: "vtex",
    });
  }
  return out;
}

export interface Catalog {
  search(term: string): Promise<CatalogProduct[]>;
}

export function createVtexCatalog(opts: { fetchImpl?: typeof fetch; baseUrl?: string } = {}): Catalog {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl ?? BASE;
  const cache = new Map<string, { at: number; value: CatalogProduct[] }>();

  return {
    async search(term) {
      const key = term.trim().toLowerCase();
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
      // A VTEX rejeita "+" como espaço: precisa ser %20 (encodeURIComponent).
      const url = `${base}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(key)}&_from=0&_to=9`;
      const res = await fetchImpl(url, {
        headers: { Accept: "application/json", "User-Agent": "JoaoDaObra-Tumelero/1.0" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok && res.status !== 206) throw new Error(`VTEX respondeu ${res.status}`);
      const value = parseVtexProducts(await res.json());
      cache.set(key, { at: Date.now(), value });
      return value;
    },
  };
}

/** Departamentos do site (árvore de categorias da VTEX), para quando não achar produto. */
export const SITE_CATEGORIES: Record<string, string> = {
  "Pisos e Revestimentos": `${BASE}/pisos-e-revestimentos`,
  "Portas e Janelas": `${BASE}/portas-e-janelas`,
  "Área Externa": `${BASE}/area-externa`,
  Climatização: `${BASE}/climatizacao`,
  Iluminação: `${BASE}/iluminacao`,
  Banheiro: `${BASE}/banheiro`,
  "Cozinha e Lavanderia": `${BASE}/cozinha-e-lavanderia`,
  Elétrica: `${BASE}/eletrica`,
  Ferramentas: `${BASE}/ferramentas`,
  Hidráulica: `${BASE}/hidraulica`,
  Tintas: `${BASE}/tintas`,
  "Materiais de Construção": `${BASE}/materiais-de-construcao`,
  Ferragens: `${BASE}/ferragens`,
  Jardim: `${BASE}/area-externa/jardim`,
  "Vasos Sanitários e Assentos": `${BASE}/banheiro/vasos-sanitarios-e-assentos`,
  "Chuveiros e Duchas": `${BASE}/banheiro/chuveiros-e-duchas`,
  "Lavadoras de Alta Pressão": `${BASE}/ferramentas/ferramentas-eletricas/lavadoras-de-alta-pressao`,
  Outlet: `${BASE}/outlet-tumelero`,
  "Cupom relâmpago": `${BASE}/cupom-relampago`,
  Novidades: `${BASE}/novidades`,
  "Nossas lojas": `${BASE}/nossas-lojas`,
};
