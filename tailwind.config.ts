import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        clay: "#B85C38",
        pine: "#1E3D2F",
        ivory: "#F7F2EB",
        parchment: "#EDE5D6",
        gold: "#C9A84C",
        white: "#FDFAF6",
        ink: "#1A1510",
        muted: "#8A7E6E",
      },
    },
  },
  plugins: [],
};
export default config;
