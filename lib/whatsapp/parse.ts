// Payload do webhook da Meta → mensagens de entrada do motor.
import type { InMessage } from "../messages";

export interface IncomingWa {
  from: string; // wa_id do cliente (usado para responder)
  id: string; // wamid, para deduplicar
  profileName: string | null;
  message: InMessage;
}

interface WaMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
  button?: { text: string; payload?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
}

const UNSUPPORTED: Record<string, string> = {
  audio: "um áudio",
  voice: "um áudio",
  image: "uma foto",
  video: "um vídeo",
  sticker: "uma figurinha",
  document: "um arquivo",
  contacts: "um contato",
};

export function parseWebhook(body: unknown): IncomingWa[] {
  const out: IncomingWa[] = [];
  const entries = (body as { entry?: unknown[] })?.entry ?? [];
  for (const entry of entries as { changes?: { field?: string; value?: Record<string, unknown> }[] }[]) {
    for (const change of entry.changes ?? []) {
      if (change.field && change.field !== "messages") continue;
      const value = change.value ?? {};
      const contacts = (value.contacts as { wa_id: string; profile?: { name?: string } }[] | undefined) ?? [];
      for (const m of (value.messages as WaMessage[] | undefined) ?? []) {
        const profileName = contacts.find((c) => c.wa_id === m.from)?.profile?.name ?? null;
        const message = toInMessage(m);
        if (message) out.push({ from: m.from, id: m.id, profileName, message });
      }
    }
  }
  return out;
}

function toInMessage(m: WaMessage): InMessage | null {
  switch (m.type) {
    case "text":
      return m.text?.body ? { type: "text", text: m.text.body } : null;
    case "interactive": {
      const r = m.interactive?.button_reply ?? m.interactive?.list_reply;
      return r ? { type: "reply", id: r.id, title: r.title } : null;
    }
    case "button":
      return m.button ? { type: "reply", id: m.button.payload ?? m.button.text, title: m.button.text } : null;
    case "location":
      return m.location
        ? { type: "location", lat: m.location.latitude, lng: m.location.longitude, name: m.location.name, address: m.location.address }
        : null;
    default:
      // O João ainda não ouve áudio nem vê foto: avisa o modelo para responder com jeito.
      return UNSUPPORTED[m.type] ? { type: "text", text: `[o cliente mandou ${UNSUPPORTED[m.type]}, que o João ainda não consegue abrir]` } : null;
  }
}
