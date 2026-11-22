import type { MetadataRoute } from "next";

/* Manifesto do app instalável (PWA). Ícones em public/icones/ (o "maskable" tem margem para o recorte
   redondo do Android); o do iPhone é src/app/apple-icon.png. O `id` fica fixo: é ele que identifica o app
   instalado, mesmo que o start_url mude. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ServentIA",
    short_name: "ServentIA",
    description: "Estudo para concursos do Judiciário com provas reais etiquetadas.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf8f3",
    theme_color: "#faf8f3",
    categories: ["education"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Atalhos ao segurar o ícone (Android e desktop).
    shortcuts: [
      { name: "Sessão de estudo", short_name: "Sessão", url: "/sessao" },
      { name: "Revisões do dia", short_name: "Revisões", url: "/revisoes" },
      { name: "Treino de verdadeiro ou falso", short_name: "Treino", url: "/treino" },
      { name: "Simulados", url: "/simulados" },
    ],
  };
}
