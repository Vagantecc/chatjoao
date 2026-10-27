// OutMessage → payload do endpoint /messages da WhatsApp Cloud API.
// Respeita os limites da Meta (3 botões, 20 caracteres, 10 linhas na lista...).
import { clip, type OutMessage, WA_LIMITS } from "../messages";

export type GraphPayload = Record<string, unknown> & { type: string };

const CTA_LABEL_MAX = 20;
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function toGraphPayloads(to: string, m: OutMessage): GraphPayload[] {
  const base = { messaging_product: "whatsapp", recipient_type: "individual", to };
  switch (m.type) {
    case "text":
      return [{ ...base, type: "text", text: { body: clip(m.text, WA_LIMITS.text), preview_url: false } }];
    case "buttons":
      return [
        {
          ...base,
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: clip(m.text, WA_LIMITS.body) },
            action: {
              buttons: m.buttons.slice(0, WA_LIMITS.buttons).map((b) => ({ type: "reply", reply: { id: b.id.slice(0, 256), title: clip(b.title, WA_LIMITS.buttonTitle) } })),
            },
          },
        },
      ];
    case "list":
      return [
        {
          ...base,
          type: "interactive",
          interactive: {
            type: "list",
            body: { text: clip(m.text, WA_LIMITS.body) },
            action: {
              button: clip(m.button, WA_LIMITS.listButton),
              sections: m.sections.map((s) => ({
                title: clip(s.title, WA_LIMITS.sectionTitle),
                rows: s.rows.slice(0, WA_LIMITS.listRows).map((r) => ({
                  id: r.id.slice(0, 200),
                  title: clip(r.title, WA_LIMITS.rowTitle),
                  ...(r.description ? { description: clip(r.description, WA_LIMITS.rowDescription) } : {}),
                })),
              })),
            },
          },
        },
      ];
    case "product": {
      const p = m.product;
      const price = p.listPrice && p.listPrice > p.price ? `~${brl(p.listPrice)}~ *${brl(p.price)}*` : `*${brl(p.price)}*`;
      const body = [p.badge ? `🏷️ ${p.badge}` : null, `*${p.name}*`, price].filter(Boolean).join("\n");
      return [
        {
          ...base,
          type: "interactive",
          interactive: {
            type: "cta_url",
            ...(p.imageUrl ? { header: { type: "image", image: { link: p.imageUrl } } } : {}),
            body: { text: clip(body, WA_LIMITS.body) },
            footer: { text: "tumelero.com.br" },
            action: { name: "cta_url", parameters: { display_text: "Ver no site", url: p.link } },
          },
        },
      ];
    }
    case "location":
      return [{ ...base, type: "location", location: { latitude: m.lat, longitude: m.lng, name: m.name, address: m.address } }];
    case "cta":
      return [
        {
          ...base,
          type: "interactive",
          interactive: {
            type: "cta_url",
            body: { text: clip(m.text, WA_LIMITS.body) },
            action: { name: "cta_url", parameters: { display_text: clip(m.label, CTA_LABEL_MAX), url: m.url } },
          },
        },
      ];
    case "document":
      return [{ ...base, type: "document", document: { link: m.url, filename: m.filename, ...(m.caption ? { caption: m.caption } : {}) } }];
  }
}
