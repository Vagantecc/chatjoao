// Geocodificação: CEP (BrasilAPI → ViaCEP + Nominatim) e texto livre (Nominatim).
// Resultados vão para o cache (memória do processo + tabela geo_cache) por 30 dias.
import type { LatLng } from "./haversine";

export interface GeoPoint extends LatLng {
  label: string;
  city: string | null;
  source: "brasilapi" | "viacep+nominatim" | "nominatim" | "whatsapp";
}

export interface GeoCache {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

export interface Geocoder {
  byCep(cep: string): Promise<GeoPoint | null>;
  byText(query: string): Promise<GeoPoint | null>;
}

const USER_AGENT = "JoaoDaObra-Tumelero/1.0 (+https://www.tumelero.com.br; atendimento via WhatsApp)";
const TIMEOUT_MS = 6000;
const TTL_MS = 30 * 24 * 3_600_000;

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function normalizeCep(input: string): string | null {
  const d = onlyDigits(input);
  return d.length === 8 ? d : null;
}

/** O Nominatim pede no máximo 1 requisição por segundo. */
let nominatimQueue: Promise<unknown> = Promise.resolve();
function throttleNominatim<T>(fn: () => Promise<T>): Promise<T> {
  const run = nominatimQueue.then(fn, fn);
  nominatimQueue = run.then(
    () => new Promise((r) => setTimeout(r, 1100)),
    () => new Promise((r) => setTimeout(r, 1100)),
  );
  return run;
}

export function createGeocoder(opts: { cache?: GeoCache; fetchImpl?: typeof fetch } = {}): Geocoder {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const mem = new Map<string, { at: number; value: GeoPoint | null }>();

  async function cached(key: string, compute: () => Promise<GeoPoint | null>): Promise<GeoPoint | null> {
    const hit = mem.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
    if (opts.cache) {
      const stored = (await opts.cache.get(key).catch(() => undefined)) as { at: number; value: GeoPoint | null } | undefined;
      if (stored && Date.now() - stored.at < TTL_MS) {
        mem.set(key, stored);
        return stored.value;
      }
    }
    const value = await compute();
    const entry = { at: Date.now(), value };
    mem.set(key, entry);
    // Só guarda acertos no banco: um erro temporário não deve "colar" por 30 dias.
    if (value && opts.cache) await opts.cache.set(key, entry).catch(() => undefined);
    return value;
  }

  async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
    const res = await fetchImpl(url, { headers: { Accept: "application/json", ...headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${new URL(url).host}`);
    return res.json();
  }

  async function nominatim(query: string): Promise<GeoPoint | null> {
    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({ q: query, format: "jsonv2", limit: "1", countrycodes: "br", addressdetails: "1", "accept-language": "pt-BR" });
    const data = (await throttleNominatim(() => getJson(url, { "User-Agent": USER_AGENT }))) as {
      lat: string;
      lon: string;
      display_name: string;
      address?: { city?: string; town?: string; village?: string; municipality?: string };
    }[];
    const hit = data[0];
    if (!hit) return null;
    const a = hit.address ?? {};
    return {
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      label: hit.display_name.split(",").slice(0, 3).join(",").trim(),
      city: a.city ?? a.town ?? a.village ?? a.municipality ?? null,
      source: "nominatim",
    };
  }

  return {
    byCep(input) {
      const cep = normalizeCep(input);
      if (!cep) return Promise.resolve(null);
      return cached(`cep:${cep}`, async () => {
        let viaStreet: { logradouro?: string; localidade?: string; uf?: string; bairro?: string } | null = null;
        try {
          const b = (await getJson(`https://brasilapi.com.br/api/cep/v2/${cep}`)) as {
            city: string;
            state: string;
            street?: string;
            neighborhood?: string;
            location?: { coordinates?: { latitude?: string; longitude?: string } };
          };
          const lat = Number(b.location?.coordinates?.latitude);
          const lng = Number(b.location?.coordinates?.longitude);
          const label = [b.street, b.neighborhood, `${b.city}/${b.state}`].filter(Boolean).join(", ");
          if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0) {
            return { lat, lng, label, city: b.city, source: "brasilapi" };
          }
          viaStreet = { logradouro: b.street, localidade: b.city, uf: b.state, bairro: b.neighborhood };
        } catch {
          // BrasilAPI fora do ar ou CEP sem coordenadas: tenta ViaCEP.
        }
        if (!viaStreet) {
          const v = (await getJson(`https://viacep.com.br/ws/${cep}/json/`).catch(() => null)) as
            | { erro?: boolean; logradouro?: string; localidade?: string; uf?: string; bairro?: string }
            | null;
          if (!v || v.erro) return null;
          viaStreet = v;
        }
        const query = [viaStreet.logradouro, viaStreet.localidade, viaStreet.uf, "Brasil"].filter(Boolean).join(", ");
        const point =
          (await nominatim(query).catch(() => null)) ??
          (await nominatim([viaStreet.localidade, viaStreet.uf, "Brasil"].filter(Boolean).join(", ")).catch(() => null));
        if (!point) return null;
        return {
          ...point,
          label: [viaStreet.logradouro, viaStreet.bairro, `${viaStreet.localidade}/${viaStreet.uf}`].filter(Boolean).join(", "),
          city: viaStreet.localidade ?? point.city,
          source: "viacep+nominatim",
        };
      });
    },

    byText(query) {
      const q = query.trim();
      if (!q) return Promise.resolve(null);
      return cached(`txt:${q.toLowerCase()}`, async () => {
        // As lojas são todas no RS: tenta primeiro dentro do estado.
        const inRs = /\b(rs|rio grande do sul)\b/i.test(q) ? q : `${q}, Rio Grande do Sul`;
        return (await nominatim(inRs)) ?? (inRs === q ? null : await nominatim(q));
      });
    },
  };
}
