import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#050912",
        panel: "#0d1527",
        "panel-strong": "#111d33",
        "panel-border": "#1f2c45",
        accent: "#7cf0c6",
        amber: "#f6c452",
        danger: "#ff7b7b",
        muted: "#9fb1cc",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "Noto Sans TC",
          "PingFang TC",
          "Microsoft JhengHei",
          "Heiti TC",
          "system-ui",
          "sans-serif",
        ],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      boxShadow: {
        glow: "0 10px 80px rgba(124, 240, 198, 0.12)",
        "inner-1": "inset 0 1px 0 rgba(255,255,255,0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
