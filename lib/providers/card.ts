// Cartão Tumelero. Hoje: mock na tabela mock_card_holders, com boleto e Pix fictícios.
// Depois: API do emissor implementando a mesma interface.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { DataStore } from "../data/store";
import type { MockCardHolderRow } from "../data/types";

export interface CardAccount {
  holderFirstName: string;
  last4: string;
  limitTotal: number;
  limitAvailable: number;
  invoice: { amount: number; dueDate: string; closingDate: string; status: "aberta" | "fechada" | "paga" };
  openDebts: { description: string; amount: number; dueDate: string }[];
  recentPurchases: { date: string; description: string; amount: number; installments?: string }[];
}

export interface Boleto {
  linhaDigitavel: string;
  amount: number;
  dueDate: string;
  pdfUrl: string;
  filename: string;
}

export interface PixCharge {
  copiaECola: string;
  amount: number;
}

export interface CardProvider {
  /** Confere CPF + data de nascimento. Devolve null se não bater. */
  verify(cpf: string, birthDate: string): Promise<CardAccount | null>;
  boleto(cpf: string, account: CardAccount): Promise<Boleto>;
  pix(cpf: string, account: CardAccount): Promise<PixCharge>;
}

function fromRow(r: MockCardHolderRow): CardAccount {
  return {
    holderFirstName: r.name.split(" ")[0],
    last4: r.last4,
    limitTotal: Number(r.limit_total),
    limitAvailable: Number(r.limit_available),
    invoice: {
      amount: Number(r.invoice.amount),
      dueDate: r.invoice.due_date,
      closingDate: r.invoice.closing_date,
      status: r.invoice.status,
    },
    openDebts: r.open_debts.map((d) => ({ description: d.description, amount: Number(d.amount), dueDate: d.due_date })),
    recentPurchases: r.recent_purchases.map((p) => ({ ...p, amount: Number(p.amount) })),
  };
}

/** Valor a cobrar: débitos que vencem até o vencimento da fatura; sem eles, a própria fatura. */
export function amountDue(a: CardAccount): number {
  const due = a.openDebts.filter((d) => d.dueDate <= a.invoice.dueDate);
  if (due.length) return Math.round(due.reduce((s, d) => s + d.amount, 0) * 100) / 100;
  return a.invoice.status === "paga" ? 0 : a.invoice.amount;
}

// ---- Boleto fictício -------------------------------------------------------

/** Linha digitável com formato de boleto, mas banco 999 (inexistente): não paga nada. */
export function fakeLinhaDigitavel(seed: string, amount: number, dueDate: string): string {
  const h = createHmac("sha256", "linha").update(seed).digest("hex").replace(/[a-f]/g, (c) => String(c.charCodeAt(0) % 10));
  const valor = String(Math.round(amount * 100)).padStart(10, "0");
  const fator = String(Math.max(1000, Math.round((Date.parse(dueDate) - Date.parse("2025-02-22")) / 86_400_000) + 1000)).padStart(4, "0");
  const d = (h + h).slice(0, 25);
  return `99990.${d.slice(0, 5)} ${d.slice(5, 10)}.${d.slice(10, 16)} ${d.slice(16, 21)}.${d.slice(21, 25)}${d[0]} 9 ${fator}${valor}`;
}

function secret(): string {
  return process.env.BOLETO_SECRET || process.env.ADMIN_PASSWORD || "joao-da-obra-dev";
}

/** Token assinado que permite baixar o PDF sem expor o CPF na URL. */
export function signBoletoToken(cpf: string, ttlMs = 7 * 86_400_000): string {
  const body = Buffer.from(JSON.stringify({ c: cpf, e: Date.now() + ttlMs })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyBoletoToken(token: string): string | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { c, e } = JSON.parse(Buffer.from(body, "base64url").toString()) as { c: string; e: number };
    return Date.now() < e ? c : null;
  } catch {
    return null;
  }
}

// ---- Pix fictício (payload EMV com CRC16 válido, chave de demonstração) -------

function emv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (const ch of Buffer.from(payload, "utf8")) {
    crc ^= ch << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function fakePixCopiaECola(amount: number, txid: string): string {
  const account = emv("00", "br.gov.bcb.pix") + emv("01", "pix-demo@tumelero.invalid") + emv("02", "DEMONSTRACAO - NAO PAGAR");
  const payload =
    emv("00", "01") +
    emv("26", account) +
    emv("52", "0000") +
    emv("53", "986") +
    emv("54", amount.toFixed(2)) +
    emv("58", "BR") +
    emv("59", "TUMELERO DEMO") +
    emv("60", "PORTO ALEGRE") +
    emv("62", emv("05", txid.slice(0, 25))) +
    "6304";
  return payload + crc16(payload);
}

export class MockCardProvider implements CardProvider {
  constructor(
    private store: DataStore,
    private appUrl: string,
  ) {}

  async verify(cpf: string, birthDate: string) {
    const row = await this.store.cardHolderByCpf(cpf.replace(/\D/g, ""));
    if (!row || row.birth_date.slice(0, 10) !== birthDate) return null;
    return fromRow(row);
  }

  async boleto(cpf: string, account: CardAccount): Promise<Boleto> {
    const amount = amountDue(account);
    const dueDate = account.invoice.dueDate;
    return {
      linhaDigitavel: fakeLinhaDigitavel(`${cpf}:${dueDate}`, amount, dueDate),
      amount,
      dueDate,
      pdfUrl: `${this.appUrl}/api/boleto/${signBoletoToken(cpf.replace(/\D/g, ""))}`,
      filename: `boleto-cartao-tumelero-${dueDate}.pdf`,
    };
  }

  async pix(cpf: string, account: CardAccount): Promise<PixCharge> {
    const amount = amountDue(account);
    const txid = `DEMO${createHmac("sha256", "pix").update(`${cpf}:${account.invoice.dueDate}`).digest("hex").slice(0, 20).toUpperCase()}`;
    return { copiaECola: fakePixCopiaECola(amount, txid), amount };
  }
}
