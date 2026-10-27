// PDF da 2ª via do Cartão Tumelero (FICTÍCIO). O token assinado identifica o titular
// sem expor o CPF na URL e expira em 7 dias.
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { getStore } from "@/lib/db";
import { maskCpf } from "@/lib/privacy/cpf";
import { amountDue, fakeLinhaDigitavel, verifyBoletoToken } from "@/lib/providers/card";
import { formatBRL, formatDateBR } from "@/lib/time";

export const runtime = "nodejs";

const LARANJA = rgb(0.949, 0.42, 0.114);
const MARINHO = rgb(0.118, 0.165, 0.29);
const CINZA = rgb(0.4, 0.4, 0.4);

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cpf = verifyBoletoToken(token);
  if (!cpf) return new Response("Link inválido ou expirado.", { status: 404 });
  const holder = await getStore().cardHolderByCpf(cpf);
  if (!holder) return new Response("Titular não encontrado.", { status: 404 });

  const account = {
    holderFirstName: holder.name,
    last4: holder.last4,
    limitTotal: Number(holder.limit_total),
    limitAvailable: Number(holder.limit_available),
    invoice: { amount: Number(holder.invoice.amount), dueDate: holder.invoice.due_date, closingDate: holder.invoice.closing_date, status: holder.invoice.status },
    openDebts: holder.open_debts.map((d) => ({ description: d.description, amount: Number(d.amount), dueDate: d.due_date })),
    recentPurchases: [],
  };
  const valor = amountDue(account);
  const linha = fakeLinhaDigitavel(`${cpf}:${account.invoice.dueDate}`, valor, account.invoice.dueDate);

  const pdf = await PDFDocument.create();
  pdf.setTitle("2ª via — Cartão Tumelero (demonstração)");
  const page = pdf.addPage([595, 420]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 0, y: height - 64, width, height: 64, color: MARINHO });
  page.drawText("tumelero", { x: 32, y: height - 42, size: 24, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Cartão Tumelero — 2ª via da fatura", { x: 200, y: height - 40, size: 13, font, color: rgb(1, 1, 1) });

  page.drawRectangle({ x: 32, y: height - 104, width: width - 64, height: 28, color: LARANJA });
  page.drawText("DOCUMENTO FICTÍCIO — DEMONSTRAÇÃO. NÃO PAGUE.", { x: 44, y: height - 95, size: 12, font: bold, color: rgb(1, 1, 1) });

  const rows: [string, string][] = [
    ["Titular", holder.name],
    ["CPF", maskCpf(cpf)],
    ["Cartão", `final ${holder.last4}`],
    ["Vencimento", formatDateBR(account.invoice.dueDate)],
    ["Valor", formatBRL(valor)],
  ];
  rows.forEach(([k, v], i) => {
    const y = height - 140 - i * 24;
    page.drawText(k, { x: 32, y, size: 11, font, color: CINZA });
    page.drawText(v, { x: 140, y, size: 12, font: bold, color: MARINHO });
  });

  page.drawText("Linha digitável", { x: 32, y: 120, size: 11, font, color: CINZA });
  page.drawText(linha, { x: 32, y: 100, size: 11, font: mono, color: MARINHO });
  // "Código de barras" decorativo
  for (let i = 0, x = 32; x < width - 40; i++) {
    const w = 1 + ((linha.charCodeAt(i % linha.length) + i) % 3);
    if (i % 2 === 0) page.drawRectangle({ x, y: 40, width: w, height: 44, color: rgb(0, 0, 0) });
    x += w + 1;
  }
  page.drawText("Gerado pelo João da Obra. Ninguém facilita tanto.", { x: 32, y: 20, size: 9, font, color: CINZA });

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="boleto-cartao-tumelero-${account.invoice.dueDate}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
