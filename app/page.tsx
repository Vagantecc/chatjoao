import QRCode from "qrcode";
import { JoaoApp } from "@/components/JoaoApp";

export default async function Home() {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5551998111390";
  const waLink = `https://wa.me/${number}?text=${encodeURIComponent("Oi, João!")}`;
  const qr = await QRCode.toDataURL(waLink, { margin: 1, width: 320, color: { dark: "#1E2A4A", light: "#FFFFFF" } });
  return <JoaoApp qrDataUrl={qr} waLink={waLink} />;
}
