import { z } from "zod";
import type { StoreRow } from "../data/types";
import type { GeoPoint } from "../geo/geocode";
import { normalizeCep } from "../geo/geocode";
import { formatDistance, sortByDistance } from "../geo/haversine";
import type { OutMessage } from "../messages";
import { todayHours } from "../stores/hours";
import { isoDateInSaoPaulo } from "../time";
import { defineTool, ToolInputError } from "./types";

const SECOND_OPTION_MAX_KM = 15;
const GERAL = { whatsapp: "(51) 99811-1390", telefone: "(51) 3371-9290" };

export function mapsUrl(store: Pick<StoreRow, "lat" | "lng" | "name" | "address" | "city">): string {
  const dest = encodeURIComponent(`${store.name}, ${store.address}, ${store.city} - RS`);
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
}

export function storeCard(store: StoreRow, distanceKm: number | null, hoursLabel: string): OutMessage[] {
  const lines = [
    `*${store.name}*`,
    `${store.address}${store.neighborhood ? `, ${store.neighborhood}` : ""} — ${store.city}`,
    `🕗 ${hoursLabel.charAt(0).toUpperCase()}${hoursLabel.slice(1)}`,
    store.whatsapp.length ? `💬 WhatsApp: ${store.whatsapp.join(" / ")}` : `📞 ${store.phone ?? GERAL.telefone}`,
    ...(distanceKm !== null ? [`📍 Uns ${formatDistance(distanceKm)} de você`] : []),
  ];
  return [
    { type: "location", lat: store.lat, lng: store.lng, name: store.name, address: `${store.address}, ${store.city} - RS` },
    { type: "cta", text: lines.join("\n"), label: "Como chegar", url: mapsUrl(store) },
  ];
}

export const buscarLojaProxima = defineTool({
  name: "buscar_loja_proxima",
  description:
    "Encontra a loja Tumelero mais próxima a partir de um CEP, de uma cidade/endereço ou da localização enviada pelo cliente. " +
    "Preencha só um dos campos. Se o cliente mandou localização, use usar_localizacao_enviada=true. " +
    "Devolve a loja mais perto (e uma segunda opção se estiver a menos de 15 km), com ids (L1...) para citar em `anexos`.",
  schema: z.object({
    cep: z.string().optional().describe("CEP com 8 dígitos"),
    cidade_ou_endereco: z.string().optional().describe('Cidade, bairro ou endereço, ex.: "Novo Hamburgo" ou "Rua X, 100, Canoas"'),
    usar_localizacao_enviada: z.boolean().optional().describe("true quando o cliente compartilhou a localização no WhatsApp"),
  }),
  async run(input, ctx) {
    let origin: GeoPoint | null = null;
    if (input.usar_localizacao_enviada) {
      const { lat, lng } = { ...ctx.conversation, ...ctx.patch };
      if (lat == null || lng == null) throw new ToolInputError("Nenhuma localização recebida nesta conversa. Peça o CEP ou a cidade.");
      origin = { lat, lng, label: "localização enviada", city: null, source: "whatsapp" };
    } else if (input.cep) {
      if (!normalizeCep(input.cep)) throw new ToolInputError("CEP precisa ter 8 dígitos.");
      origin = await ctx.geocoder.byCep(input.cep);
    } else if (input.cidade_ou_endereco) {
      origin = await ctx.geocoder.byText(input.cidade_ou_endereco);
    } else {
      throw new ToolInputError("Informe cep, cidade_ou_endereco ou usar_localizacao_enviada.");
    }

    const stores = await ctx.store.listStores();
    if (!origin) {
      return {
        data: {
          encontrado: false,
          aviso: "Não consegui localizar esse endereço. Peça o CEP ou o nome da cidade.",
          todas_as_lojas: stores.map((s) => `${s.name} (${s.city})`),
          lista_completa: "https://www.tumelero.com.br/nossas-lojas",
        },
        summary: `não localizou ${input.cep ?? input.cidade_ou_endereco}`,
      };
    }

    const today = isoDateInSaoPaulo(ctx.now);
    const holidays = await ctx.store.listHolidays(today, today);
    const ranked = sortByDistance(origin, stores);
    const picks = ranked.slice(0, 2).filter((s, i) => i === 0 || s.distanceKm < SECOND_OPTION_MAX_KM);

    const lojas = picks.map((s) => {
      const h = todayHours(s, ctx.now, holidays);
      const id = ctx.attachments.add("L", storeCard(s, s.distanceKm, h.label));
      return {
        id,
        nome: s.name,
        cidade: s.city,
        endereco: `${s.address}${s.neighborhood ? `, ${s.neighborhood}` : ""}`,
        distancia: formatDistance(s.distanceKm),
        horario: h.label,
        aberta_agora: h.openNow,
        whatsapp: s.whatsapp.length ? s.whatsapp : null,
      };
    });

    // Guarda a cidade do cliente para não perguntar de novo.
    if (origin.city && !ctx.conversation.city) ctx.patch.city = origin.city;
    if (input.cep && !ctx.conversation.cep) ctx.patch.cep = normalizeCep(input.cep);

    return {
      data: {
        encontrado: true,
        origem: origin.label,
        lojas,
        atendimento_geral: GERAL,
        dica: "Cite os ids em `anexos`: o card já traz endereço, horário de hoje, WhatsApp, distância e o botão Como chegar.",
      },
      summary: `${origin.label} → ${lojas.map((l) => `${l.nome} (${l.distancia})`).join(", ")}`,
    };
  },
});
