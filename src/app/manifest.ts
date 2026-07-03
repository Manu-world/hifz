import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hifz",
    short_name: "Hifz",
    description: "A personal spaced-repetition drill app for Arabic vocabulary.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fefdf9",
    theme_color: "#fefdf9",
    lang: "en",
    icons: [
      {
        src: "/pwa-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
