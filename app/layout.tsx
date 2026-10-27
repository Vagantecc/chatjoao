import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Nunito (SIL Open Font License) hospedada no projeto: o build não depende do Google Fonts.
const nunito = localFont({ src: "./fonts/nunito-latin-var.woff2", variable: "--font-sans", weight: "400 900", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "João da Obra — Tumelero",
  description: "O joão-de-barro da Tumelero no WhatsApp. Quem entende de construir, vem pra Tumelero.",
  icons: { icon: "/joao-avatar.png", apple: "/joao-avatar.png" },
  openGraph: { title: "João da Obra", description: "Quem entende de construir, vem pra Tumelero.", images: ["/joao-da-obra.png"] },
};

export const viewport: Viewport = { themeColor: "#075E54", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={nunito.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
