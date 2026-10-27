import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { welcomeMessages } from "@/lib/joao-brain";
import { toGraphPayloads } from "@/lib/whatsapp/convert";
import { parseWebhook } from "@/lib/whatsapp/parse";
import { validSignature } from "@/lib/whatsapp/send";

const TO = "5551999990000";

describe("toGraphPayloads", () => {
  it("boas-vindas viram botões de resposta + lista interativa", () => {
    const [buttons, list] = welcomeMessages().flatMap((m) => toGraphPayloads(TO, m));
    expect(buttons).toMatchObject({
      messaging_product: "whatsapp",
      to: TO,
      type: "interactive",
      interactive: { type: "button", action: { buttons: [{ type: "reply", reply: { title: "Achar um produto" } }, {}, {}] } },
    });
    expect(list).toMatchObject({
      type: "interactive",
      interactive: { type: "list", action: { button: "Mais opções", sections: [{ rows: [{ title: "Rastrear pedido" }, {}, {}] }] } },
    });
  });

  it("corta botões e títulos nos limites da Meta", () => {
    const [p] = toGraphPayloads(TO, {
      type: "buttons",
      text: "x".repeat(2000),
      buttons: [1, 2, 3, 4].map((i) => ({ id: `b${i}`, title: `Um título comprido demais ${i}` })),
    });
    const action = (p.interactive as { action: { buttons: { reply: { title: string } }[] }; body: { text: string } });
    expect(action.action.buttons).toHaveLength(3);
    expect(action.action.buttons.every((b) => [...b.reply.title].length <= 20)).toBe(true);
    expect(action.body.text.length).toBeLessThanOrEqual(1024);
  });

  it("card de produto vira cta_url com imagem e botão Ver no site", () => {
    const [p] = toGraphPayloads(TO, {
      type: "product",
      product: { name: "Manta Líquida", price: 219.9, listPrice: 259.9, imageUrl: "https://img/x.jpg", link: "https://www.tumelero.com.br/manta/p" },
    });
    expect(p).toMatchObject({
      type: "interactive",
      interactive: {
        type: "cta_url",
        header: { type: "image", image: { link: "https://img/x.jpg" } },
        action: { name: "cta_url", parameters: { display_text: "Ver no site", url: "https://www.tumelero.com.br/manta/p" } },
      },
    });
    expect((p.interactive as { body: { text: string } }).body.text).toMatch(/~R\$\s259,90~ \*R\$\s219,90\*/);
  });

  it("localização, link e documento", () => {
    expect(toGraphPayloads(TO, { type: "location", lat: -29.7, lng: -51.1, name: "Loja", address: "Rua X" })[0]).toMatchObject({
      type: "location",
      location: { latitude: -29.7, longitude: -51.1, name: "Loja", address: "Rua X" },
    });
    expect(toGraphPayloads(TO, { type: "cta", text: "Endereço", label: "Como chegar", url: "https://maps" })[0]).toMatchObject({
      interactive: { type: "cta_url", action: { parameters: { display_text: "Como chegar", url: "https://maps" } } },
    });
    expect(toGraphPayloads(TO, { type: "document", url: "https://x/b.pdf", filename: "b.pdf", caption: "2ª via" })[0]).toMatchObject({
      type: "document",
      document: { link: "https://x/b.pdf", filename: "b.pdf", caption: "2ª via" },
    });
  });
});

const webhook = (messages: unknown[]) => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA",
      changes: [
        {
          field: "messages",
          value: { messaging_product: "whatsapp", contacts: [{ wa_id: TO, profile: { name: "Ana" } }], messages },
        },
      ],
    },
  ],
});

describe("parseWebhook", () => {
  it("texto, botão, lista e localização", () => {
    const parsed = parseWebhook(
      webhook([
        { from: TO, id: "w1", type: "text", text: { body: "oi" } },
        { from: TO, id: "w2", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "menu_loja", title: "Loja mais perto" } } },
        { from: TO, id: "w3", type: "interactive", interactive: { type: "list_reply", list_reply: { id: "menu_pedido", title: "Rastrear pedido" } } },
        { from: TO, id: "w4", type: "location", location: { latitude: -29.69, longitude: -51.14, name: "Casa" } },
      ]),
    );
    expect(parsed.map((p) => p.message)).toEqual([
      { type: "text", text: "oi" },
      { type: "reply", id: "menu_loja", title: "Loja mais perto" },
      { type: "reply", id: "menu_pedido", title: "Rastrear pedido" },
      { type: "location", lat: -29.69, lng: -51.14, name: "Casa", address: undefined },
    ]);
    expect(parsed[0]).toMatchObject({ from: TO, id: "w1", profileName: "Ana" });
  });

  it("áudio vira aviso para o modelo; status de entrega é ignorado", () => {
    const [audio] = parseWebhook(webhook([{ from: TO, id: "w5", type: "audio", audio: { id: "x" } }]));
    expect(audio.message).toEqual({ type: "text", text: "[o cliente mandou um áudio, que o João ainda não consegue abrir]" });
    const statuses = { entry: [{ changes: [{ field: "messages", value: { statuses: [{ id: "w1", status: "read" }] } }] }] };
    expect(parseWebhook(statuses)).toEqual([]);
    expect(parseWebhook(null)).toEqual([]);
  });
});

describe("validSignature", () => {
  it("confere o HMAC do corpo", () => {
    const body = JSON.stringify(webhook([]));
    const sig = `sha256=${createHmac("sha256", "segredo").update(body).digest("hex")}`;
    expect(validSignature(body, sig, "segredo")).toBe(true);
    expect(validSignature(body + " ", sig, "segredo")).toBe(false);
    expect(validSignature(body, null, "segredo")).toBe(false);
  });
});
