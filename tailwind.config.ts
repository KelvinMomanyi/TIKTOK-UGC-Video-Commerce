import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./extensions/**/*.{liquid,js}"],
  theme: {
    extend: {
      borderRadius: {
        tvc: "8px",
      },
      colors: {
        tvc: {
          accent: "#0f8b8d",
          ink: "#111827",
          muted: "#5b6472",
          surface: "#ffffff",
        },
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
} satisfies Config;
