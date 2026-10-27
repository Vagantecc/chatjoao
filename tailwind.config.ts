import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tumelero: { laranja: "#F26B1D", marinho: "#1E2A4A", barro: "#C98A5E", areia: "#E9C9A8" },
        wa: {
          header: "#008069",
          headerDark: "#075E54",
          bg: "#EFEAE2",
          out: "#D9FDD3",
          in: "#FFFFFF",
          tick: "#53BDEB",
          link: "#027EB5",
          meta: "#667781",
          text: "#111B21",
          green: "#25D366",
        },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      keyframes: {
        blink: { "0%,80%,100%": { opacity: "0.2" }, "40%": { opacity: "1" } },
        pop: { from: { opacity: "0", transform: "translateY(6px) scale(.98)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: { blink: "blink 1.4s infinite both", pop: "pop .18s ease-out" },
    },
  },
  plugins: [],
} satisfies Config;
