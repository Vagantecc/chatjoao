"use client";

import Image from "next/image";

export function Landing({ qrDataUrl, waLink, onStart }: { qrDataUrl: string; waLink: string; onStart: () => void }) {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[radial-gradient(ellipse_at_70%_60%,#C98A5E_0%,#a96f4c_45%,#7a4930_100%)] text-white">
      {/* Mascote: o fundo terra da imagem se funde com o fundo da página */}
      <div className="absolute inset-0 md:left-[30%] md:[mask-image:linear-gradient(to_right,transparent,black_28%)]">
        <Image
          src="/joao-da-obra.png"
          alt="João da Obra: joão-de-barro de capacete laranja com o “t” da Tumelero, jardineira azul-marinho e colher de pedreiro, acenando"
          fill
          priority
          sizes="(min-width: 768px) 70vw, 100vw"
          className="object-cover object-[50%_20%]"
        />
      </div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#3b1f10]/85 via-[#3b1f10]/20 to-transparent md:bg-gradient-to-r md:from-[#3b1f10]/55 md:via-transparent md:to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-5 pb-8 pt-5 md:px-10">
        <header className="flex items-center justify-between">
          <span className="rounded-full bg-tumelero-marinho/90 px-4 py-1.5 text-sm font-extrabold tracking-wide">
            tumelero <span className="text-tumelero-laranja">60 anos</span>
          </span>
          <a
            href="/admin"
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline"
          >
            Painel
          </a>
        </header>

        <section className="mt-auto max-w-xl md:my-auto">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#FFD9B8]">Agora no WhatsApp da Tumelero</p>
          <h1 className="mt-2 text-5xl font-black leading-[0.95] drop-shadow-sm sm:text-6xl md:text-7xl">João da Obra</h1>
          <p className="mt-4 max-w-md text-lg font-semibold leading-snug text-white/95">
            O joão-de-barro que entende de obra. Ele acha o produto certo, faz a conta dos cupons da Strada, mostra a loja mais perto e
            acompanha teu pedido.
          </p>
          <p className="mt-4 border-l-4 border-tumelero-laranja pl-3 text-base italic text-[#FFE8D6]">
            João da Obra. Quem entende de construir, vem pra Tumelero.
          </p>

          <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-full bg-tumelero-laranja px-7 py-4 text-lg font-extrabold text-tumelero-marinho shadow-lg shadow-black/25 transition hover:-translate-y-0.5 hover:bg-[#ff7a2c] active:translate-y-0"
            >
              <ChatIcon />
              Conversar com o João
            </button>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-2xl bg-white/95 p-2.5 pr-4 text-tumelero-marinho shadow-lg shadow-black/20"
            >
              <img src={qrDataUrl} alt="QR code para falar com o João no WhatsApp" width={84} height={84} className="rounded-lg" />
              <span className="text-sm leading-tight">
                <strong className="block text-base">No celular?</strong>
                Aponte a câmera e fale
                <br />
                com o João no WhatsApp
                <span className="mt-1 block text-xs text-tumelero-marinho/60">QR provisório · número oficial em ativação</span>
              </span>
            </a>
          </div>
        </section>

        <footer className="mt-8 text-sm font-bold text-white/80 md:mt-0">Ninguém facilita tanto.</footer>
      </div>
    </main>
  );
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}
