"use client";

import { useEffect, useState } from "react";
import { Landing } from "./Landing";
import { Simulator } from "./Simulator";

export function JoaoApp({ qrDataUrl, waLink }: { qrDataUrl: string; waLink: string }) {
  const [view, setView] = useState<"landing" | "chat">("landing");

  // Permite abrir direto no chat com /#chat (útil para apresentar).
  useEffect(() => {
    if (window.location.hash === "#chat") setView("chat");
  }, []);

  const open = (v: "landing" | "chat") => {
    setView(v);
    history.replaceState(null, "", v === "chat" ? "#chat" : " ");
  };

  return view === "landing" ? (
    <Landing qrDataUrl={qrDataUrl} waLink={waLink} onStart={() => open("chat")} />
  ) : (
    <Simulator onBack={() => open("landing")} />
  );
}
