import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { IBM_Plex_Sans, Literata } from "next/font/google";

import { Cabecalho } from "~/components/Cabecalho";
import { CatalogoProvider } from "~/lib/catalogo";

export const metadata: Metadata = {
  title: "public-prep · estudo para concursos",
  description: "Provas reais etiquetadas por tema e dispositivo, sessões, revisões espaçadas e treino de verdadeiro ou falso.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = { viewportFit: "cover" };

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-plex" });
const literata = Literata({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--font-literata" });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${plex.variable} ${literata.variable}`}>
      <body>
        <CatalogoProvider>
          <Cabecalho />
          <main>
            <div className="wrap">{children}</div>
          </main>
          <footer className="wrap rodape">
            Seu progresso fica só neste navegador. Exporte uma cópia em <a href="/ajustes">Ajustes</a>.
          </footer>
        </CatalogoProvider>
      </body>
    </html>
  );
}
